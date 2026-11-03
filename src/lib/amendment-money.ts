/**
 * What a customer pays or gets back after changing a booking.
 *
 * The amount is measured against the payments ledger (money actually kept),
 * not just the old fare, so an earlier change whose refund or top-up is still
 * open is never counted twice.
 */
export type AmendmentOutcome = "even" | "topup" | "refund" | "pay_full";

export function amendmentMoney(input: {
  paymentStatus: string;
  /** New fare minus the fare before this change, in pounds. */
  delta: number;
  newPrice: number;
  /** New fare minus net money kept from the ledger, in pence; null when no ledger rows exist. */
  balancePence: number | null;
}): { outcome: AmendmentOutcome; amountDue: number; refundDue: number } {
  const { paymentStatus, delta, newPrice, balancePence } = input;
  const settled = paymentStatus === "paid" || paymentStatus === "partial";
  // Unpaid, or marked part paid by hand with no recorded payments: the whole new fare is payable.
  if (!settled || (paymentStatus === "partial" && balancePence == null)) {
    return { outcome: "pay_full", amountDue: newPrice, refundDue: 0 };
  }
  const balance = balancePence != null ? balancePence / 100 : delta;
  const rounded = Number(balance.toFixed(2));
  if (rounded > 0.5) return { outcome: "topup", amountDue: rounded, refundDue: 0 };
  if (rounded < -0.5) return { outcome: "refund", amountDue: 0, refundDue: Math.abs(rounded) };
  return { outcome: "even", amountDue: 0, refundDue: 0 };
}
