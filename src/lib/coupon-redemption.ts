/**
 * Coupon redemption step for booking creation.
 *
 * A discounted booking must never survive a failed redemption, otherwise the
 * coupon is under-counted. The DB routine `redeem_coupon` locks the coupon row,
 * records the redemption and bumps `used_count` atomically; if it errors or
 * rejects (limit reached / duplicate) the just-created booking is deleted and a
 * retry message is returned to the caller.
 *
 * Kept free of framework imports so both the server function and tests use the
 * exact same logic.
 */

export type RedemptionClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => { delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> } };
};

export type RedemptionOutcome =
  | { ok: true }
  | { ok: false; message: string; rolledBack: boolean };

export const COUPON_RETRY_MESSAGE = "That promo code could no longer be applied. Please book again without it.";
export const COUPON_LIMIT_MESSAGE = "That promo code has reached its usage limit. Please book again without it.";

export async function redeemCouponOrRollback(
  client: RedemptionClient,
  input: { couponId: string; bookingId: string; email: string; discount: number },
): Promise<RedemptionOutcome> {
  let redeemed = false;
  let message = COUPON_RETRY_MESSAGE;

  try {
    const red = await client.rpc("redeem_coupon", {
      _coupon_id: input.couponId,
      _booking_id: input.bookingId,
      _email: input.email.trim().toLowerCase(),
      _amount: input.discount,
    });
    if (red.error) {
      console.error("coupon redemption failed", red.error);
    } else if (red.data === false) {
      message = COUPON_LIMIT_MESSAGE;
    } else {
      redeemed = true;
    }
  } catch (err) {
    console.error("coupon redemption failed", err);
  }

  if (redeemed) return { ok: true };

  const undo = await client.from("bookings").delete().eq("id", input.bookingId);
  if (undo.error) console.error("failed to roll back unredeemed discounted booking", undo.error);
  return { ok: false, message, rolledBack: !undo.error };
}
