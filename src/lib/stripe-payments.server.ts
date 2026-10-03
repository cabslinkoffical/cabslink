import type Stripe from "stripe";
import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Records (or updates) a payment row for a completed Checkout session with the
 * payer and card details, so admins can see who paid and how. Idempotent on
 * the session id — safe to call from both the return page and the webhook.
 */
export async function recordStripePayment(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  env: StripeEnv,
  bookingId: string,
  fallbackAmount: number,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let processorStatus: string | null = session.payment_status ?? null;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      processorStatus = pi.status;
      const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
      const card = charge?.payment_method_details?.card;
      cardBrand = card?.brand ?? null;
      cardLast4 = card?.last4 ?? null;
    } catch { /* details are best-effort */ }
  }

  const amount = session.amount_total != null ? session.amount_total / 100 : fallbackAmount;
  const row = {
    booking_id: bookingId,
    amount,
    currency: (session.currency ?? "gbp").toUpperCase(),
    method: "card",
    status: "paid" as const,
    reference: session.id,
    notes: `Stripe Checkout (${env})`,
    paid_at: new Date().toISOString(),
    payer_name: session.customer_details?.name ?? null,
    payer_email: session.customer_details?.email ?? session.customer_email ?? null,
    card_brand: cardBrand,
    card_last4: cardLast4,
    payment_intent_id: piId,
    processor_status: processorStatus,
    environment: env,
  };

  const existing = await supabaseAdmin.from("payments").select("id").eq("reference", session.id).maybeSingle();
  if (existing.data) {
    const { paid_at: _p, ...upd } = row;
    return supabaseAdmin.from("payments").update(upd).eq("id", existing.data.id);
  }
  // Replace a placeholder row recorded from the booking, if any.
  await supabaseAdmin.from("payments").delete().eq("booking_id", bookingId).is("reference", null);
  return supabaseAdmin.from("payments").insert(row);
}
