import type Stripe from "stripe";
import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Server-only payment rules for Cabslink card checkout.
 *
 * Everything that decides *what* is charged, *which* Stripe account is used and
 * *whether* a booking may be marked paid lives here, so the browser can never
 * influence it. Database and notification access are injected (`PaymentDeps`)
 * so the rules are unit-testable without a live backend.
 */

// ---------------------------------------------------------------- types

export type BookingForPayment = {
  id: string;
  booking_ref: string;
  price: number | string | null;
  quoted_total: number | string | null;
  quote_expires_at: string | null;
  email: string | null;
  customer_name?: string | null;
  status: string;
  payment_status: string;
};

export type PaymentDeps = {
  /** Service-role Supabase client (RLS bypassed). */
  db: any;
  /** Best-effort admin alert; must never throw. */
  notifyAdmin?: (subject: string, lines: string[], bookingId: string | null) => Promise<void>;
};

const BOOKING_COLUMNS =
  "id, booking_ref, price, quoted_total, quote_expires_at, email, customer_name, status, payment_status";

/** Booking statuses that can never be paid for again. */
export const CHECKOUT_BLOCKED_STATUSES = ["cancelled", "rejected", "completed", "expired"] as const;
/** The only statuses a successful payment may move to `confirmed`. */
export const CONFIRMABLE_FROM_STATUSES = ["new", "pending_payment"] as const;

// ---------------------------------------------------------------- environment

/**
 * The server alone decides which Stripe account is used. Only clearly
 * non-production hosts (editor preview, local dev) use the sandbox; every other
 * host — including any new custom domain — uses live, so the sandbox key is
 * never used in production.
 */
export function resolveStripeEnvForHost(host: string | null | undefined): StripeEnv {
  const h = (host ?? "").toLowerCase().split(":")[0].trim();
  if (!h) return "live";
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0") return "sandbox";
  if (h.endsWith(".lovableproject.com")) return "sandbox";
  if (h.startsWith("id-preview--") && h.endsWith(".lovable.app")) return "sandbox";
  if (h.endsWith("-dev.lovable.app")) return "sandbox";
  return "live";
}

/** Host of an incoming request, honouring the edge proxy's forwarded host. */
export function hostFromRequest(request: Request): string {
  const fwd = request.headers.get("x-forwarded-host");
  if (fwd) return fwd.split(",")[0].trim();
  try {
    return new URL(request.url).host;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- pure rules

/** Amount owed in pence: saved price, else the server quote. Null if none. */
export function bookingAmountPence(b: Pick<BookingForPayment, "price" | "quoted_total">): number | null {
  const raw = b.price ?? b.quoted_total;
  if (raw == null) return null;
  const pence = Math.round(Number(raw) * 100);
  return Number.isFinite(pence) && pence >= 100 ? pence : null;
}

/** Why a booking may not start checkout, or null when it may. */
export function checkoutRefusal(b: BookingForPayment, now: number = Date.now()): string | null {
  if (b.payment_status === "paid") return "This booking is already paid.";
  if ((CHECKOUT_BLOCKED_STATUSES as readonly string[]).includes(b.status)) {
    return "This booking can no longer be paid online. Please contact us.";
  }
  if (b.quote_expires_at && new Date(b.quote_expires_at).getTime() < now) {
    return "This quote has expired. Please book again to get a fresh price.";
  }
  if (bookingAmountPence(b) == null) return "This booking has no payable fare yet. Please contact us.";
  return null;
}

export type SessionCheck =
  | { ok: true; pence: number }
  | { ok: false; reason: "not_paid" | "wrong_currency" | "ref_mismatch" | "no_fare" | "amount_mismatch" };

/** A completed session must be paid, in GBP, for this booking, for exactly its fare. */
export function verifyPaidSession(
  session: Pick<Stripe.Checkout.Session, "payment_status" | "currency" | "amount_total" | "metadata">,
  booking: BookingForPayment,
): SessionCheck {
  if (session.payment_status !== "paid") return { ok: false, reason: "not_paid" };
  if ((session.currency ?? "").toLowerCase() !== "gbp") return { ok: false, reason: "wrong_currency" };
  const ref = (session.metadata?.booking_ref ?? "").toUpperCase();
  if (!ref || ref !== booking.booking_ref.toUpperCase()) return { ok: false, reason: "ref_mismatch" };
  const pence = bookingAmountPence(booking);
  if (pence == null) return { ok: false, reason: "no_fare" };
  if (session.amount_total !== pence) return { ok: false, reason: "amount_mismatch" };
  return { ok: true, pence };
}

/**
 * Booking changes for a verified payment. Status only moves forward from
 * `new`/`pending_payment`; a refunded booking is never flipped back to paid.
 */
export function bookingUpdateForPayment(b: BookingForPayment, pence: number): Record<string, unknown> | null {
  const upd: Record<string, unknown> = {};
  if ((CONFIRMABLE_FROM_STATUSES as readonly string[]).includes(b.status)) upd.status = "confirmed";
  if (b.payment_status !== "paid" && b.payment_status !== "refunded") upd.payment_status = "paid";
  if (b.price == null && Object.keys(upd).length) upd.price = pence / 100;
  return Object.keys(upd).length ? upd : null;
}

const toIso = (unixSeconds: number | null | undefined) =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

// ---------------------------------------------------------------- db helpers

export async function findBookingByRef(db: any, ref: string): Promise<BookingForPayment | null> {
  const res = await db.from("bookings").select(BOOKING_COLUMNS).eq("booking_ref", ref.toUpperCase()).maybeSingle();
  if (res.error || !res.data) return null;
  return res.data as BookingForPayment;
}

export async function logPaymentActivity(
  db: any,
  action: string,
  entityId: string | null,
  diff: Record<string, unknown>,
) {
  try {
    await db.from("activity_logs").insert({
      action,
      entity: "booking",
      entity_id: entityId,
      actor_id: null,
      actor_email: "stripe",
      diff,
    });
  } catch (e) {
    console.error("[payments] could not write activity log", action, e);
  }
}

/** Default admin alert: email to the configured admin notification address. */
export async function defaultNotifyAdmin(subject: string, lines: string[], bookingId: string | null) {
  try {
    const { getAdminNotificationEmail, sendAndLog } = await import("@/lib/notifications.server");
    const to = await getAdminNotificationEmail();
    if (!to) return;
    const text = lines.join("\n");
    const html = lines.map((l) => `<p>${l.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>`).join("");
    await sendAndLog({
      bookingId,
      eventKey: null,
      notificationType: "payment_alert",
      recipientCategory: "admin",
      recipient: to,
      subject,
      text,
      html,
    });
  } catch (e) {
    console.error("[payments] admin notification failed", e);
  }
}

export async function defaultPaymentDeps(): Promise<PaymentDeps> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { db: supabaseAdmin, notifyAdmin: defaultNotifyAdmin };
}

// ---------------------------------------------------------------- checkout

export type CheckoutForBookingResult = { clientSecret: string; environment: StripeEnv } | { error: string };

/** Single entry point for starting card checkout: fare comes from the saved booking only. */
export async function createCheckoutForBooking(
  opts: { bookingRef: string; returnUrl: string; env: StripeEnv; stripe: Stripe },
  deps: PaymentDeps,
): Promise<CheckoutForBookingResult> {
  const booking = await findBookingByRef(deps.db, opts.bookingRef);
  if (!booking) return { error: "We couldn't find that booking." };
  const refusal = checkoutRefusal(booking);
  if (refusal) return { error: refusal };
  const pence = bookingAmountPence(booking)!;
  const ref = booking.booking_ref.toUpperCase();

  const session = await opts.stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded_page",
    return_url: opts.returnUrl,
    payment_method_types: ["card"],
    line_items: [{
      price_data: { currency: "gbp", unit_amount: pence, product_data: { name: `Cabslink booking ${ref}` } },
      quantity: 1,
    }],
    payment_intent_data: { description: `Cabslink booking ${ref}`, metadata: { booking_ref: ref } },
    ...(booking.email ? { customer_email: booking.email } : {}),
    metadata: { booking_ref: ref },
  } as any);
  return { clientSecret: session.client_secret ?? "", environment: opts.env };
}

// ---------------------------------------------------------------- payment events

export type ApplyResult =
  | { applied: true; bookingId: string; status: string; paymentStatus: string }
  | { applied: false; reason: string; bookingId?: string; status?: string; paymentStatus?: string };

/**
 * Applies a completed Checkout session. Verification happens first; on any
 * mismatch nothing is changed and `payment_amount_mismatch` is logged.
 * Safe to call repeatedly (return page + webhook + Stripe retries).
 */
export async function applyPaidSession(
  opts: { session: Stripe.Checkout.Session; env: StripeEnv; stripe?: Stripe; eventCreated?: number | null },
  deps: PaymentDeps,
): Promise<ApplyResult> {
  const { session } = opts;
  const ref = (session.metadata?.booking_ref ?? "").toUpperCase();
  const booking = ref ? await findBookingByRef(deps.db, ref) : null;
  const check: SessionCheck = booking ? verifyPaidSession(session, booking) : { ok: false, reason: "ref_mismatch" };

  if (!check.ok) {
    await logPaymentActivity(deps.db, "payment_amount_mismatch", booking?.id ?? null, {
      reason: check.reason,
      session_id: session.id,
      booking_ref: ref || null,
      session_amount_total: session.amount_total ?? null,
      session_currency: session.currency ?? null,
      session_payment_status: session.payment_status ?? null,
      expected_pence: booking ? bookingAmountPence(booking) : null,
      environment: opts.env,
    });
    if (check.reason !== "not_paid") {
      await deps.notifyAdmin?.(
        `Payment check failed for ${ref || "unknown booking"}`,
        [`Stripe session ${session.id} did not match the booking (${check.reason}).`, "Nothing was changed. Please review in Stripe."],
        booking?.id ?? null,
      );
    }
    return { applied: false, reason: check.reason, bookingId: booking?.id, status: booking?.status, paymentStatus: booking?.payment_status };
  }

  const b = booking!;
  const upd = bookingUpdateForPayment(b, check.pence);
  let status = b.status;
  let paymentStatus = b.payment_status;
  if (upd) {
    let q = deps.db.from("bookings").update(upd).eq("id", b.id);
    // Guard against a concurrent status change between read and write.
    if (upd.status) q = q.in("status", CONFIRMABLE_FROM_STATUSES as unknown as string[]);
    const res = await q.select("status, payment_status").maybeSingle();
    if (res.error) return { applied: false, reason: "update_failed", bookingId: b.id, status, paymentStatus };
    if (res.data) { status = res.data.status; paymentStatus = res.data.payment_status; }
  }

  if (!(CONFIRMABLE_FROM_STATUSES as readonly string[]).includes(b.status) && b.status !== "confirmed" && b.payment_status !== "paid") {
    await logPaymentActivity(deps.db, "payment_received_late", b.id, { session_id: session.id, booking_status: b.status });
    await deps.notifyAdmin?.(
      `Payment received for ${b.booking_ref} (status: ${b.status})`,
      [`A card payment arrived while the booking was "${b.status}". The booking status was not changed.`],
      b.id,
    );
  }

  await recordStripePayment({ session, env: opts.env, stripe: opts.stripe, bookingId: b.id, eventCreated: opts.eventCreated }, deps);
  return { applied: true, bookingId: b.id, status, paymentStatus };
}

/**
 * Upserts the payment row (keyed on the Checkout session id) with payer and
 * card details. `paid_at` comes from Stripe's own timestamps, never the
 * server clock.
 */
export async function recordStripePayment(
  opts: { session: Stripe.Checkout.Session; env: StripeEnv; stripe?: Stripe; bookingId: string; eventCreated?: number | null },
  deps: PaymentDeps,
) {
  const { session, stripe } = opts;
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let processorStatus: string | null = session.payment_status ?? null;
  let chargeCreated: number | null = null;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (piId && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      processorStatus = pi.status;
      const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
      const card = charge?.payment_method_details?.card;
      cardBrand = card?.brand ?? null;
      cardLast4 = card?.last4 ?? null;
      chargeCreated = charge?.created ?? null;
    } catch { /* details are best-effort */ }
  }

  const row = {
    booking_id: opts.bookingId,
    amount: (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? "gbp").toUpperCase(),
    method: "card",
    status: "paid",
    reference: session.id,
    notes: `Stripe Checkout (${opts.env})`,
    paid_at: toIso(chargeCreated ?? opts.eventCreated ?? session.created),
    payer_name: session.customer_details?.name ?? null,
    payer_email: session.customer_details?.email ?? session.customer_email ?? null,
    card_brand: cardBrand,
    card_last4: cardLast4,
    payment_intent_id: piId,
    processor_status: processorStatus,
    environment: opts.env,
  };

  // Replace a placeholder row recorded from the booking, if any.
  await deps.db.from("payments").delete().eq("booking_id", opts.bookingId).is("reference", null);
  return deps.db.from("payments").upsert(row, { onConflict: "reference" });
}

export async function handleSessionExpired(session: Stripe.Checkout.Session, env: StripeEnv, deps: PaymentDeps) {
  const ref = (session.metadata?.booking_ref ?? "").toUpperCase();
  const booking = ref ? await findBookingByRef(deps.db, ref) : null;
  await deps.db
    .from("payments")
    .update({ processor_status: "expired" })
    .eq("reference", session.id)
    .neq("status", "paid");
  await logPaymentActivity(deps.db, "payment_checkout_expired", booking?.id ?? null, {
    session_id: session.id, booking_ref: ref || null, environment: env,
  });
  await deps.notifyAdmin?.(
    `Checkout expired for ${ref || "unknown booking"}`,
    [`The card checkout for ${ref || session.id} expired without payment.`],
    booking?.id ?? null,
  );
}

export async function handleChargeRefunded(charge: Stripe.Charge, env: StripeEnv, deps: PaymentDeps) {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
  const full = charge.amount_refunded >= charge.amount;
  const res = piId
    ? await deps.db
        .from("payments")
        .update({ status: full ? "refunded" : "partial", processor_status: full ? "refunded" : "partially_refunded" })
        .eq("payment_intent_id", piId)
        .select("booking_id")
    : { data: [] };
  const bookingId = (res?.data?.[0]?.booking_id as string | undefined) ?? null;
  await logPaymentActivity(deps.db, "payment_refunded", bookingId, {
    charge_id: charge.id, payment_intent_id: piId, amount_refunded_pence: charge.amount_refunded,
    amount_pence: charge.amount, full, environment: env,
  });
  await deps.notifyAdmin?.(
    full ? "Card payment refunded" : "Card payment partly refunded",
    [`Stripe refunded £${(charge.amount_refunded / 100).toFixed(2)} of £${(charge.amount / 100).toFixed(2)} (charge ${charge.id}).`],
    bookingId,
  );
}

export async function handleDisputeCreated(dispute: Stripe.Dispute, env: StripeEnv, deps: PaymentDeps) {
  const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id ?? null;
  const res = piId
    ? await deps.db.from("payments").update({ processor_status: "disputed" }).eq("payment_intent_id", piId).select("booking_id")
    : { data: [] };
  const bookingId = (res?.data?.[0]?.booking_id as string | undefined) ?? null;
  await logPaymentActivity(deps.db, "payment_disputed", bookingId, {
    dispute_id: dispute.id, payment_intent_id: piId, amount_pence: dispute.amount, reason: dispute.reason, environment: env,
  });
  await deps.notifyAdmin?.(
    "Card payment disputed",
    [`A customer opened a dispute for £${(dispute.amount / 100).toFixed(2)} (reason: ${dispute.reason}). Respond in Stripe before the deadline.`],
    bookingId,
  );
}
