/**
 * Server-only settlement of change requests (amendments). Staff marking a
 * top-up as paid records the money as a manual ledger row; the booking's
 * payment state is then derived from all money held against the current fare.
 * Applying a change request by itself never marks a booking paid.
 */
import { netCollectedPence } from "@/lib/payment-ledger";
import { bookingAmountPence, paidPayments, reconcileBookingPaymentStatus, type BookingForPayment } from "@/lib/stripe-payments.server";

export async function settleAmendmentPayment(opts: {
  db: any;
  amendmentId: string;
  markPaid: boolean;
  actorId: string | null;
}): Promise<{ recordedPence: number; paymentStatus: string | null }> {
  const { db } = opts;
  const aRes = await db.from("booking_amendments")
    .select("id, booking_id, booking_ref, delta, top_up_paid_at")
    .eq("id", opts.amendmentId).maybeSingle();
  if (aRes.error) throw new Error(aRes.error.message);
  const amendment = aRes.data;
  if (!amendment) throw new Error("Change request not found");

  let bookingId: string | null = amendment.booking_id ?? null;
  if (!bookingId && amendment.booking_ref) {
    const b = await db.from("bookings").select("id").eq("booking_ref", amendment.booking_ref).maybeSingle();
    if (b.error) throw new Error(b.error.message);
    bookingId = b.data?.id ?? null;
  }
  if (!bookingId) return { recordedPence: 0, paymentStatus: null };

  let recordedPence = 0;
  if (opts.markPaid && amendment.top_up_paid_at == null) {
    // Claim the settlement first so a double click cannot record money twice.
    const claimedAt = new Date().toISOString();
    const claim = await db.from("booking_amendments")
      .update({ top_up_paid_at: claimedAt })
      .eq("id", amendment.id).is("top_up_paid_at", null)
      .select("id").maybeSingle();
    if (claim.error) throw new Error(claim.error.message);
    if (claim.data) {
      const deltaPence = Math.max(0, Math.round(Number(amendment.delta ?? 0) * 100));
      if (deltaPence > 0) {
        const bRes = await db.from("bookings").select("id, price, quoted_total").eq("id", bookingId).maybeSingle();
        if (bRes.error || !bRes.data) {
          await db.from("booking_amendments").update({ top_up_paid_at: null }).eq("id", amendment.id);
          throw new Error(bRes.error?.message ?? "Booking not found");
        }
        const fare = bookingAmountPence(bRes.data as BookingForPayment) ?? 0;
        const held = netCollectedPence(await paidPayments(db, bookingId));
        // Record only what is genuinely still owed, never more than this request's top-up.
        recordedPence = Math.min(deltaPence, Math.max(0, fare - held));
        if (recordedPence > 0) {
          const ins = await db.from("payments").insert({
            booking_id: bookingId,
            amount: recordedPence / 100,
            currency: "GBP",
            method: "cash",
            status: "paid",
            reference: null,
            notes: `Manual settlement of change request ${amendment.id}`,
            paid_at: claimedAt,
          });
          if (ins?.error) {
            await db.from("booking_amendments").update({ top_up_paid_at: null }).eq("id", amendment.id);
            throw new Error(`The payment could not be recorded: ${ins.error.message}`);
          }
        }
      }
    }
  }

  const paymentStatus = await reconcileBookingPaymentStatus(db, bookingId);
  return { recordedPence, paymentStatus };
}
