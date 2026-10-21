/**
 * Pure decision rules for admin handling of a customer cancellation request.
 * - approved / refunded / completed  → the booking is cancelled (unless the
 *   admin explicitly unticks it on "completed").
 * - refunded → money goes back: amount must be > 0 and ≤ the fare.
 * - declined → the booking is left untouched.
 * - a request already refunded/declined/completed is closed and can't reopen.
 */
export type CancellationDecisionInput = {
  previousStatus: string;
  nextStatus: string;
  refundAmount: number | null;
  bookingPrice: number | null;
  bookingStatus: string | null;
  paymentStatus: string | null;
  cancelBooking?: boolean;
};

export type CancellationDecision = {
  error: string | null;
  cancelBooking: boolean;
  issueRefund: boolean;
  refundAmount: number;
  fullRefund: boolean;
};

const CLOSED = new Set(["refunded", "declined", "completed"]);
const CANCELS = new Set(["approved", "refunded", "completed"]);

export function cancellationDecision(i: CancellationDecisionInput): CancellationDecision {
  const none = { cancelBooking: false, issueRefund: false, refundAmount: 0, fullRefund: false };
  if (CLOSED.has(i.previousStatus) && i.nextStatus !== i.previousStatus) {
    return { ...none, error: "This request is already closed and can't be changed." };
  }
  const bookingOpen = !!i.bookingStatus && !["cancelled", "rejected", "completed"].includes(i.bookingStatus);
  if (CANCELS.has(i.nextStatus) && i.bookingStatus === "completed") {
    return { ...none, error: "This journey is already completed, so it can't be cancelled." };
  }
  const cancelBooking = CANCELS.has(i.nextStatus) && bookingOpen && i.cancelBooking !== false;

  let issueRefund = false;
  let refundAmount = 0;
  let fullRefund = false;
  if (i.nextStatus === "refunded" && i.previousStatus !== "refunded") {
    const paid = i.paymentStatus === "paid" || i.paymentStatus === "partial";
    if (!paid) return { ...none, error: "Nothing was paid on this booking, so there is nothing to refund. Use Approved instead." };
    refundAmount = Math.round(Number(i.refundAmount ?? i.bookingPrice ?? 0) * 100) / 100;
    if (!(refundAmount > 0)) return { ...none, error: "Enter the refund amount." };
    if (i.bookingPrice != null && refundAmount > i.bookingPrice + 0.001) {
      return { ...none, error: `The refund can't be more than the fare (£${i.bookingPrice.toFixed(2)}).` };
    }
    issueRefund = true;
    fullRefund = i.bookingPrice == null || refundAmount >= i.bookingPrice - 0.001;
  }
  return { error: null, cancelBooking, issueRefund, refundAmount, fullRefund };
}
