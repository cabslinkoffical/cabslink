/**
 * Server-only cancellation refunds. A refund is spread across every card
 * charge on the booking (newest first) by what each still holds; anything the
 * cards cannot cover (cash, or beyond card funds) is reported for staff to pay
 * back manually. Each card refund is logged against the cancellation request,
 * so a retry after a partial failure only refunds what is still owed.
 */
import { allocateCardRefund } from "@/lib/payment-ledger";
import { paidPayments, reconcileBookingPaymentStatus } from "@/lib/stripe-payments.server";

type StripeLike = { refunds: { create: (args: any, opts?: any) => Promise<{ id: string }> } };

export async function issueCancellationRefund(opts: {
  db: any;
  requestId: string;
  bookingId: string;
  refundPence: number;
  actorId: string | null;
  stripeFor: (env: "sandbox" | "live") => StripeLike;
  stripeErrorMessage?: (e: unknown) => string;
}): Promise<{ note: string; refundedToCardPence: number; manualPence: number }> {
  const { db } = opts;
  const target = Math.max(0, Math.round(opts.refundPence));

  // Card refunds already issued for this request (from an earlier attempt).
  const prior = await db.from("activity_logs")
    .select("diff")
    .eq("action", "cancellation_refund_issued")
    .eq("entity_id", opts.bookingId);
  if (prior.error) throw new Error(`Refund history could not be checked: ${prior.error.message}`);
  const alreadyPence = (prior.data ?? [])
    .filter((r: any) => r.diff?.request_id === opts.requestId)
    .reduce((s: number, r: any) => s + Number(r.diff?.pence ?? 0), 0);

  const rows = await paidPayments(db, opts.bookingId);
  const { allocations, manualPence } = allocateCardRefund(rows, Math.max(0, target - alreadyPence));

  const issued: string[] = [];
  let refundedNow = 0;
  for (const a of allocations) {
    const env = a.row.environment === "sandbox" ? "sandbox" : "live";
    let refundId: string;
    try {
      const refund = await opts.stripeFor(env).refunds.create(
        { payment_intent: a.row.payment_intent_id, amount: a.pence },
        { idempotencyKey: `cancel-${opts.requestId}-${a.row.id}-${alreadyPence + refundedNow}-${a.pence}` },
      );
      refundId = refund.id;
    } catch (e) {
      const done = issued.length ? ` Already refunded in this attempt: ${issued.join("; ")}.` : "";
      throw new Error(`Stripe refund failed: ${opts.stripeErrorMessage ? opts.stripeErrorMessage(e) : String(e)}.${done} Retrying will refund only the remainder.`);
    }
    refundedNow += a.pence;
    issued.push(`${refundId} £${(a.pence / 100).toFixed(2)}`);
    const log = await db.from("activity_logs").insert({
      action: "cancellation_refund_issued", entity: "booking", entity_id: opts.bookingId,
      actor_id: opts.actorId, diff: { request_id: opts.requestId, payment_id: a.row.id, refund_id: refundId, pence: a.pence },
    });
    // Stop before touching the ledger: a retry then repeats the same Stripe
    // request (same idempotency key), which Stripe answers without refunding twice.
    if (log?.error) throw new Error(`Stripe refund ${refundId} succeeded, but it could not be logged. Retry to finish recording it.`);
    const newRefunded = Number(a.row.refunded_amount ?? 0) + a.pence / 100;
    const upd = await db.from("payments").update({
      refunded_amount: Number(newRefunded.toFixed(2)),
      status: a.fullyRefunded ? "refunded" : "partial",
      processor_status: a.fullyRefunded ? "refunded" : "partially_refunded",
    }).eq("id", a.row.id);
    if (upd?.error) throw new Error(`Stripe refund ${refundId} succeeded, but the payment record could not be updated: ${upd.error.message}`);
  }

  await reconcileBookingPaymentStatus(db, opts.bookingId);

  const parts: string[] = [];
  if (issued.length) parts.push(`Stripe refund${issued.length > 1 ? "s" : ""} ${issued.join(", ")}`);
  if (alreadyPence > 0) parts.push(`£${(alreadyPence / 100).toFixed(2)} already refunded earlier for this request`);
  if (manualPence > 0) parts.push(`£${(manualPence / 100).toFixed(2)} to pay back manually (not held on a card)`);
  return {
    note: parts.join(" · ") || "No refund was due",
    refundedToCardPence: refundedNow,
    manualPence,
  };
}
