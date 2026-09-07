// Public "Manage booking" server functions: verified lookup (track) and
// customer-initiated cancellation requests.
//
// Verification rule: the last name used on the booking is ALWAYS required, plus
// at least one of booking reference or email. That means a guessed reference
// alone reveals nothing, so a verified lookup can safely return the customer's
// own full journey details (unlike the masked reference-only tracker).

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { SITE } from "@/lib/site";

const GENERIC_NOT_FOUND =
  "We couldn't match those details to a booking. Check the last name exactly as it was entered when booking, and either the reference or the email address used.";

const identitySchema = z
  .object({
    bookingRef: z.string().trim().max(50).optional().or(z.literal("")),
    email: z.string().trim().max(255).optional().or(z.literal("")),
    lastName: z.string().trim().min(2, "Enter the last name used on the booking").max(80),
  })
  .refine((v) => !!(v.bookingRef && v.bookingRef.trim()) || !!(v.email && v.email.trim()), {
    message: "Enter your booking reference or the email address used to book.",
    path: ["bookingRef"],
  });

type Identity = z.infer<typeof identitySchema>;

const SELECT =
  "id, booking_ref, status, payment_status, customer_name, email, phone, pickup_address, dropoff_address, pickup_place_id, dropoff_place_id, pickup_date, pickup_time, passengers, luggage, hand_luggage, vehicle_type, vehicle_id, vehicle_class_name_snapshot, vehicle_capacity_snapshot, flight_number, meet_greet, child_seat, child_seat_count, return_journey, notes, selected_pois, price, distance_miles, created_at, cancellation_reason, service_type, admin_notes";

function noStore() {
  try {
    setResponseHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    setResponseHeader("Referrer-Policy", "no-referrer");
  } catch { /* not available in every context */ }
}

function ipOf(): string {
  try { return getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { return "unknown"; }
}

/** Last-name match: the supplied value must equal one of the name's words. */
function surnameMatches(fullName: string | null, supplied: string): boolean {
  if (!fullName) return false;
  const want = supplied.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  if (!want) return false;
  const words = fullName.toLowerCase().split(/[\s'-]+/).map((w) => w.replace(/[^\p{L}\p{N}]+/gu, "")).filter(Boolean);
  return words.includes(want);
}

export type RefundTier = "unpaid" | "full" | "partial" | "none";

export type ManagedBooking = {
  bookingRef: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  email: string;
  phone: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  luggage: number;
  handLuggage: number;
  vehicleType: string | null;
  flightNumber: string | null;
  meetGreet: boolean;
  childSeat: boolean;
  childSeatCount: number;
  returnJourney: boolean;
  notes: string | null;
  price: number | null;
  distanceMiles: number | null;
  createdAt: string;
  cancellationReason: string | null;
  serviceType: string | null;
  /** Cancellation window facts, computed server-side (never trust the clock in the browser). */
  cancellation: {
    /** Whether a cancellation request can still be submitted. */
    allowed: boolean;
    /** Why not, when `allowed` is false. */
    blockedReason: string | null;
    tier: RefundTier;
    hoursUntilPickup: number | null;
    withinBookingGrace: boolean;
    policyLabel: string;
    policyDetail: string;
    /** A cancellation request from the customer is already open. */
    requested: boolean;
    requestedAt: string | null;
  };

  /** Amendment window facts (what the customer may change themselves). */
  amendment: {
    allowed: boolean;
    blockedReason: string | null;
  };
};


/** Combine pickup date + "HH:MM" into a UTC-ish timestamp for window maths. */
function pickupTimestamp(date: string | null, time: string | null): number | null {
  if (!date) return null;
  const t = /^\d{1,2}:\d{2}$/.test(time ?? "") ? (time as string) : "00:00";
  const ms = Date.parse(`${date}T${t.padStart(5, "0")}:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

const TERMINAL = new Set(["cancelled", "rejected", "completed"]);

function cancellationFacts(row: any, now = Date.now()): ManagedBooking["cancellation"] {
  const createdMs = Date.parse(row.created_at ?? "");
  const withinBookingGrace = Number.isFinite(createdMs) && now - createdMs <= 24 * 3_600_000;
  const pickupMs = pickupTimestamp(row.pickup_date, row.pickup_time);
  const hoursUntilPickup = pickupMs == null ? null : Math.round(((pickupMs - now) / 3_600_000) * 10) / 10;

  const status = String(row.status ?? "");
  let allowed = true;
  let blockedReason: string | null = null;
  if (TERMINAL.has(status)) {
    allowed = false;
    blockedReason =
      status === "cancelled"
        ? "This booking is already cancelled."
        : status === "completed"
        ? "This journey has already been completed, so it can no longer be cancelled."
        : "This booking is no longer active. Please contact us if you need help.";
  } else if (hoursUntilPickup != null && hoursUntilPickup < 0) {
    allowed = false;
    blockedReason = `The pickup time has already passed. Please call us on ${SITE.phoneUK} so we can help.`;
  }

  const farFromPickup = hoursUntilPickup == null ? true : hoursUntilPickup >= 24;
  const paymentStatus = String(row.payment_status ?? "unpaid");
  const nothingPaid = paymentStatus === "unpaid" || paymentStatus === "failed";
  const tier: RefundTier = !allowed
    ? "none"
    : nothingPaid
    ? "unpaid"
    : withinBookingGrace || farFromPickup
    ? "full"
    : "partial";

  const policyLabel =
    tier === "unpaid"
      ? "No payment taken — nothing to refund"
      : tier === "full"
      ? "Eligible for a full refund"
      : tier === "partial"
      ? "Eligible for a partial refund claim"
      : "Refund review required";
  const policyDetail =
    tier === "unpaid"
      ? "We have not charged you for this booking yet, so cancelling costs you nothing and there is no refund to process. We'll release the vehicle and confirm by email."
      : tier === "full"
      ? withinBookingGrace
        ? "You booked less than 24 hours ago, so cancelling now qualifies for a full refund of anything you have paid."
        : "Your pickup is more than 24 hours away, so cancelling now qualifies for a full refund of anything you have paid."
      : tier === "partial"
      ? "Your pickup is less than 24 hours away. Cancelling now is treated as a partial-refund claim — our team reviews driver and allocation costs already committed and confirms the amount by email."
      : "Our team will review this booking manually and reply by email.";

  return { allowed, blockedReason, tier, hoursUntilPickup, withinBookingGrace, policyLabel, policyDetail };
}

async function findBooking(id: Identity) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ref = (id.bookingRef ?? "").trim().toUpperCase();
  const email = (id.email ?? "").trim().toLowerCase();

  let query = supabaseAdmin.from("bookings").select(SELECT).is("deleted_at", null);
  if (ref) query = query.eq("booking_ref", ref);
  if (email) query = query.ilike("email", email);

  const res: any = await query.order("created_at", { ascending: false }).limit(5);
  if (res.error) throw new Error("Unable to look up your booking right now. Please try again.");
  const rows: any[] = res.data ?? [];
  const match = rows.find((r) => surnameMatches(r.customer_name, id.lastName));
  return match ?? null;
}

function project(row: any): ManagedBooking {
  return {
    bookingRef: row.booking_ref,
    status: row.status,
    paymentStatus: (row.payment_status ?? "unpaid") as string,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone ?? null,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    passengers: row.passengers ?? 1,
    luggage: row.luggage ?? 0,
    handLuggage: row.hand_luggage ?? 0,
    vehicleType: row.vehicle_class_name_snapshot ?? row.vehicle_type ?? null,
    flightNumber: row.flight_number ?? null,
    meetGreet: !!row.meet_greet,
    childSeat: !!row.child_seat,
    childSeatCount: row.child_seat_count ?? (row.child_seat ? 1 : 0),
    returnJourney: !!row.return_journey,
    notes: row.notes ?? null,
    price: row.price == null ? null : Number(row.price),
    distanceMiles: row.distance_miles == null ? null : Number(row.distance_miles),
    createdAt: row.created_at,
    cancellationReason: row.cancellation_reason ?? null,
    serviceType: row.service_type ?? null,
    cancellation: cancellationFacts(row),
    amendment: amendmentFacts(row),
  };
}

/**
 * What the customer may change themselves. Self-service amendments are
 * limited to straightforward point-to-point bookings that are still a safe
 * distance from pickup — anything else routes to the team by phone.
 */
const AMEND_MIN_HOURS = 6;

function amendmentFacts(row: any, now = Date.now()): ManagedBooking["amendment"] {
  const status = String(row.status ?? "");
  if (TERMINAL.has(status)) {
    return {
      allowed: false,
      blockedReason:
        status === "cancelled"
          ? "This booking is cancelled, so it can no longer be changed."
          : status === "completed"
          ? "This journey has already been completed."
          : "This booking is no longer active. Please contact us if you need help.",
    };
  }
  const pois = Array.isArray(row.selected_pois) ? row.selected_pois : [];
  if (pois.length > 0 || (row.service_type && row.service_type !== "direct_transfer")) {
    return {
      allowed: false,
      blockedReason: `Tours and journeys with stops are re-priced by our team. Please call ${SITE.phoneUK} and we'll make the change for you.`,
    };
  }
  if (!row.pickup_place_id || !row.dropoff_place_id || !row.vehicle_id) {
    return {
      allowed: false,
      blockedReason: `We can't re-price this booking automatically. Please call ${SITE.phoneUK} and we'll change it for you.`,
    };
  }
  const pickupMs = pickupTimestamp(row.pickup_date, row.pickup_time);
  const hours = pickupMs == null ? null : (pickupMs - now) / 3_600_000;
  if (hours != null && hours < AMEND_MIN_HOURS) {
    return {
      allowed: false,
      blockedReason:
        hours < 0
          ? `The pickup time has already passed. Please call us on ${SITE.phoneUK}.`
          : `Your pickup is less than ${AMEND_MIN_HOURS} hours away, so changes are handled by our team. Please call ${SITE.phoneUK}.`,
    };
  }
  return { allowed: true, blockedReason: null };
}


// ---------------- Verified lookup ----------------
export const findMyBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identitySchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const ip = ipOf();
    if (!checkLimit({ name: "manageBookingLookup", windowMs: 10 * 60_000, max: 15 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many attempts. Please wait a few minutes and try again.");
    }
    const row = await findBooking(data);
    if (!row) throw new Error(GENERIC_NOT_FOUND);
    return project(row);
  });

// ---------------- Cancellation request ----------------
const CANCEL_REASONS = [
  "Travel plans changed",
  "Flight cancelled or rescheduled",
  "Booked by mistake / duplicate booking",
  "Found an alternative arrangement",
  "Illness or emergency",
  "Other",
] as const;

export const CANCELLATION_REASONS = CANCEL_REASONS;

const cancelInput = z.object({
  bookingRef: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  lastName: z.string().trim().min(2).max(80),
  reason: z.enum(CANCEL_REASONS),
  details: z.string().trim().max(600).optional().or(z.literal("")),
  callbackPhone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const requestBookingCancellation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cancelInput.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const ip = ipOf();
    if (!checkLimit({ name: "manageBookingCancel", windowMs: 10 * 60_000, max: 5 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many requests. Please wait a few minutes or call us instead.");
    }

    const row = await findBooking({ bookingRef: data.bookingRef, email: data.email, lastName: data.lastName } as Identity);
    if (!row) throw new Error(GENERIC_NOT_FOUND);

    const facts = cancellationFacts(row);
    if (!facts.allowed) throw new Error(facts.blockedReason ?? "This booking can no longer be cancelled online.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const message = [
      `Cancellation request for booking ${row.booking_ref}.`,
      `Refund tier assessed: ${facts.tier === "unpaid" ? "NO PAYMENT TAKEN — nothing to refund" : facts.tier === "full" ? "FULL REFUND" : "PARTIAL REFUND CLAIM"}.`,
      facts.hoursUntilPickup != null ? `Hours until pickup at request time: ${facts.hoursUntilPickup}.` : "",
      `Booked at: ${row.created_at}.`,
      `Journey: ${row.pickup_address} → ${row.dropoff_address} on ${row.pickup_date} ${row.pickup_time}.`,
      `Fare on file: ${row.price == null ? "—" : `£${Number(row.price).toFixed(2)}`} (${row.payment_status}).`,
      "",
      `Reason: ${data.reason}`,
      data.details ? `Customer notes: ${data.details}` : "",
      data.callbackPhone ? `Call-back number: ${data.callbackPhone}` : `Call-back number: ${row.phone ?? "—"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabaseAdmin.from("cancellation_requests").insert({
      booking_id: row.id ?? null,
      booking_ref: row.booking_ref,
      customer_name: row.customer_name,
      email: row.email,
      phone: row.phone ?? null,
      reason: data.reason,
      details: data.details || null,
      callback_phone: data.callbackPhone || null,
      refund_tier: facts.tier,
      hours_until_pickup: facts.hoursUntilPickup,
      price_at_request: row.price ?? null,
      payment_status_at_request: row.payment_status ?? null,
      pickup_date: row.pickup_date ?? null,
      pickup_time: row.pickup_time ?? null,
      pickup_address: row.pickup_address ?? null,
      dropoff_address: row.dropoff_address ?? null,
      status: "pending",
    });
    if (error) {
      console.error("cancellation request insert failed", error);
      throw new Error("We couldn't record that request. Please call us so we can cancel it for you.");
    }

    // Flag it on the booking itself so the operations panel sees the intent
    // even before anyone opens the inbox. The status change stays with an
    // admin, because refunds are money movements.
    try {
      await supabaseAdmin
        .from("bookings")
        .update({
          admin_notes: `${row.admin_notes ? `${row.admin_notes}\n\n` : ""}[${new Date().toISOString()}] Customer cancellation request (${facts.tier}): ${data.reason}${data.details ? ` — ${data.details}` : ""}`,
        })
        .eq("booking_ref", row.booking_ref);
    } catch (err) {
      console.error("cancellation admin_notes update failed", err);
    }

    try {
      const { notifyEnquiry } = await import("@/lib/notifications.server");
      await notifyEnquiry({
        kind: "contact",
        name: row.customer_name,
        email: row.email,
        phone: data.callbackPhone || row.phone || null,
        subject: `Cancellation request: ${row.booking_ref}`,
        message,
        extra: [
          { label: "Booking reference", value: row.booking_ref },
          { label: "Refund tier", value: facts.tier === "full" ? "Full refund" : "Partial refund claim" },
          { label: "Pickup", value: `${row.pickup_date} ${row.pickup_time}` },
          { label: "Reason", value: data.reason },
        ],
      });
    } catch (err) {
      console.error("cancellation notify failed", err);
    }

    return {
      ok: true as const,
      bookingRef: row.booking_ref as string,
      tier: facts.tier,
      phone: SITE.phoneUK,
    };
  });

// ---------------- Amendment (customer-initiated change) ----------------
// The customer may change a limited, safe set of details on a straightforward
// point-to-point booking. The new fare is ALWAYS recomputed server-side by the
// same engine that priced the original booking, so the customer can never
// influence the price — only the journey inputs.

const amendChanges = z.object({
  pickupDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a pickup date"),
  pickupTime: z.string().trim().regex(/^\d{1,2}:\d{2}$/, "Choose a pickup time"),
  passengers: z.number().int().min(1, "At least one passenger").max(60),
  luggage: z.number().int().min(0).max(60),
  handLuggage: z.number().int().min(0).max(60),
  flightNumber: z.string().trim().max(20).optional().or(z.literal("")),
  meetGreet: z.boolean(),
  childSeatCount: z.number().int().min(0).max(6),
  returnJourney: z.boolean(),
  notes: z.string().trim().max(600).optional().or(z.literal("")),
});

export type AmendChanges = z.infer<typeof amendChanges>;

const amendInput = z
  .object({
    bookingRef: z.string().trim().max(50).optional().or(z.literal("")),
    email: z.string().trim().max(255).optional().or(z.literal("")),
    lastName: z.string().trim().min(2).max(80),
    changes: amendChanges,
  })
  .refine((v) => !!(v.bookingRef && v.bookingRef.trim()) || !!(v.email && v.email.trim()), {
    message: "Enter your booking reference or the email address used to book.",
    path: ["bookingRef"],
  });

export type AmendmentQuote = {
  bookingRef: string;
  currentPrice: number;
  newPrice: number;
  /** Positive = more to pay, negative = refund due, 0 = no change. */
  delta: number;
  distanceMiles: number;
  vehicleName: string;
  paymentStatus: string;
  /** Human-readable list of what will change. */
  changedLines: string[];
  outcome: AmendmentOutcome;
  amountDue: number;
  refundDue: number;
};

export type AmendmentOutcome = "even" | "topup" | "refund" | "pay_full";

const money = (n: number) => `£${n.toFixed(2)}`;

function describeChanges(row: any, c: AmendChanges): string[] {
  const lines: string[] = [];
  if (row.pickup_date !== c.pickupDate) lines.push(`Date: ${row.pickup_date} → ${c.pickupDate}`);
  if (String(row.pickup_time) !== c.pickupTime) lines.push(`Time: ${row.pickup_time} → ${c.pickupTime}`);
  if ((row.passengers ?? 1) !== c.passengers) lines.push(`Passengers: ${row.passengers} → ${c.passengers}`);
  if ((row.luggage ?? 0) !== c.luggage) lines.push(`Suitcases: ${row.luggage ?? 0} → ${c.luggage}`);
  if ((row.hand_luggage ?? 0) !== c.handLuggage) lines.push(`Hand bags: ${row.hand_luggage ?? 0} → ${c.handLuggage}`);
  if ((row.flight_number ?? "") !== (c.flightNumber ?? "")) lines.push(`Flight number: ${row.flight_number || "—"} → ${c.flightNumber || "—"}`);
  if (!!row.meet_greet !== c.meetGreet) lines.push(`Meet & greet: ${row.meet_greet ? "yes" : "no"} → ${c.meetGreet ? "yes" : "no"}`);
  if ((row.child_seat_count ?? 0) !== c.childSeatCount) lines.push(`Child seats: ${row.child_seat_count ?? 0} → ${c.childSeatCount}`);
  if (!!row.return_journey !== c.returnJourney) lines.push(`Return journey: ${row.return_journey ? "yes" : "no"} → ${c.returnJourney ? "yes" : "no"}`);
  if ((row.notes ?? "") !== (c.notes ?? "")) lines.push("Notes updated");
  return lines;
}

function outcomeFor(paymentStatus: string, delta: number): AmendmentOutcome {
  const settled = paymentStatus === "paid";
  if (!settled) return "pay_full";
  if (delta > 0.5) return "topup";
  if (delta < -0.5) return "refund";
  return "even";
}

/** Shared: verify identity, gate the amendment window, re-price. */
async function amendmentContext(data: z.infer<typeof amendInput>) {
  const row = await findBooking({ bookingRef: data.bookingRef, email: data.email, lastName: data.lastName });
  if (!row) throw new Error(GENERIC_NOT_FOUND);

  const facts = amendmentFacts(row);
  if (!facts.allowed) throw new Error(facts.blockedReason ?? "This booking can't be changed online.");

  const c = data.changes;
  const newPickupMs = pickupTimestamp(c.pickupDate, c.pickupTime);
  if (newPickupMs == null) throw new Error("That pickup date and time isn't valid.");
  if (newPickupMs - Date.now() < AMEND_MIN_HOURS * 3_600_000) {
    throw new Error(`Please choose a pickup at least ${AMEND_MIN_HOURS} hours from now, or call us on ${SITE.phoneUK}.`);
  }

  const { repriceExistingBooking } = await import("@/lib/pricing.functions");
  const priced = await repriceExistingBooking({
    pickupPlaceId: row.pickup_place_id,
    pickupLabel: row.pickup_address,
    destinationPlaceId: row.dropoff_place_id,
    destinationLabel: row.dropoff_address,
    pickupDate: c.pickupDate,
    pickupTime: c.pickupTime,
    passengers: c.passengers,
    luggage: c.luggage,
    handLuggage: c.handLuggage,
    vehicleId: row.vehicle_id,
    vehicleCount: Number((row.vehicle_capacity_snapshot as any)?.vehicle_count ?? 1) || 1,
    meetGreet: c.meetGreet,
    childSeatCount: c.childSeatCount,
    returnJourney: c.returnJourney,
  });

  const currentPrice = row.price == null ? 0 : Number(row.price);
  const newPrice = priced.price;
  const delta = Number((newPrice - currentPrice).toFixed(2));
  const paymentStatus = String(row.payment_status ?? "unpaid");
  const outcome = outcomeFor(paymentStatus, delta);

  const quote: AmendmentQuote = {
    bookingRef: row.booking_ref,
    currentPrice,
    newPrice,
    delta,
    distanceMiles: priced.distanceMiles,
    vehicleName: priced.vehicleName,
    paymentStatus,
    changedLines: describeChanges(row, c),
    outcome,
    amountDue: outcome === "topup" ? Math.abs(delta) : outcome === "pay_full" ? newPrice : 0,
    refundDue: outcome === "refund" ? Math.abs(delta) : 0,
  };
  return { row, quote, changes: c };
}

/** Price-only preview — nothing is saved. */
export const quoteBookingAmendment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => amendInput.parse(input))
  .handler(async ({ data }): Promise<AmendmentQuote> => {
    noStore();
    const ip = ipOf();
    if (!checkLimit({ name: "amendQuote", windowMs: 10 * 60_000, max: 25 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many attempts. Please wait a few minutes and try again.");
    }
    const { quote } = await amendmentContext(data);
    return quote;
  });

export type AmendmentResult = AmendmentQuote & { amendmentId: string };

/** Applies the amendment to the booking and records what happens with money. */
export const submitBookingAmendment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => amendInput.parse(input))
  .handler(async ({ data }): Promise<AmendmentResult> => {
    noStore();
    const ip = ipOf();
    if (!checkLimit({ name: "amendSubmit", windowMs: 10 * 60_000, max: 10 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many attempts. Please wait a few minutes and try again.");
    }

    const { row, quote, changes: c } = await amendmentContext(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const previous = {
      pickup_date: row.pickup_date,
      pickup_time: row.pickup_time,
      passengers: row.passengers,
      luggage: row.luggage,
      hand_luggage: row.hand_luggage,
      flight_number: row.flight_number,
      meet_greet: row.meet_greet,
      child_seat_count: row.child_seat_count,
      return_journey: row.return_journey,
      notes: row.notes,
      price: row.price,
    };

    const update: Record<string, unknown> = {
      pickup_date: c.pickupDate,
      pickup_time: c.pickupTime,
      passengers: c.passengers,
      luggage: c.luggage,
      hand_luggage: c.handLuggage,
      flight_number: c.flightNumber || null,
      meet_greet: c.meetGreet,
      child_seat: c.childSeatCount > 0,
      child_seat_count: c.childSeatCount,
      return_journey: c.returnJourney,
      notes: c.notes || null,
      price: quote.newPrice,
      distance_miles: quote.distanceMiles,
    };
    // A paid booking whose fare went up is only part paid until the customer
    // settles the difference. A fare that went down stays "paid" — the refund
    // is a money movement an admin performs.
    if (quote.outcome === "topup") update["payment_status"] = "partial";

    const amendmentStatus =
      quote.outcome === "topup" ? "pending_payment" : quote.outcome === "refund" ? "awaiting_refund" : "applied";

    const ins: any = await supabaseAdmin
      .from("booking_amendments")
      .insert({
        booking_id: row.id ?? null,
        booking_ref: row.booking_ref,
        customer_name: row.customer_name,
        email: row.email,
        phone: row.phone ?? null,
        status: amendmentStatus,
        old_price: quote.currentPrice,
        new_price: quote.newPrice,
        delta: quote.delta,
        payment_status_at_request: quote.paymentStatus,
        changes: c as unknown as Record<string, unknown>,
        previous,
        customer_note: quote.changedLines.join("\n") || null,
        refund_amount: quote.refundDue > 0 ? quote.refundDue : null,
      } as any)
      .select("id")
      .maybeSingle();
    if (ins.error || !ins.data) {
      console.error("amendment insert failed", ins.error);
      throw new Error("We couldn't save that change. Please call us so we can update the booking for you.");
    }

    const upd: any = await supabaseAdmin.from("bookings").update(update as any).eq("id", row.id);
    if (upd.error) {
      console.error("amendment booking update failed", upd.error);
      await supabaseAdmin.from("booking_amendments").update({ status: "declined", admin_notes: "Booking update failed" } as any).eq("id", ins.data.id);
      throw new Error("We couldn't apply that change. Please call us so we can update the booking for you.");
    }

    const summary = [
      `Customer amended booking ${row.booking_ref}.`,
      ...quote.changedLines,
      `Fare: ${money(quote.currentPrice)} → ${money(quote.newPrice)} (${quote.delta >= 0 ? "+" : "−"}${money(Math.abs(quote.delta))}).`,
      quote.outcome === "topup"
        ? `Awaiting card top-up of ${money(quote.amountDue)}.`
        : quote.outcome === "refund"
        ? `REFUND DUE: ${money(quote.refundDue)} — review and process.`
        : quote.outcome === "pay_full"
        ? `Booking still unpaid — new amount payable ${money(quote.newPrice)}.`
        : "No price change.",
    ].join("\n");

    try {
      await supabaseAdmin
        .from("bookings")
        .update({
          admin_notes: `${row.admin_notes ? `${row.admin_notes}\n\n` : ""}[${new Date().toISOString()}] ${summary}`,
        } as any)
        .eq("id", row.id);
    } catch (err) {
      console.error("amendment admin_notes update failed", err);
    }

    try {
      const { notifyEnquiry } = await import("@/lib/notifications.server");
      await notifyEnquiry({
        kind: "contact",
        name: row.customer_name,
        email: row.email,
        phone: row.phone ?? null,
        subject: `Booking amended: ${row.booking_ref}`,
        message: summary,
        extra: [
          { label: "Booking reference", value: row.booking_ref },
          { label: "New fare", value: money(quote.newPrice) },
          { label: "Difference", value: `${quote.delta >= 0 ? "+" : "−"}${money(Math.abs(quote.delta))}` },
          { label: "Action", value: amendmentStatus },
        ],
      });
    } catch (err) {
      console.error("amendment notify failed", err);
    }

    return { ...quote, amendmentId: ins.data.id as string };
  });
