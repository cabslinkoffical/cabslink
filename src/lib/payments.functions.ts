import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Card-only checkout for a saved booking. The fare is calculated by the booking
 * engine, so the amount is passed as an inline one-off price. Only card is
 * offered — `payment_method_types: ["card"]` disables wallets, bank debits and
 * every other method Stripe would otherwise surface.
 */
export const createBookingCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    amountPence: number;
    bookingRef: string;
    email?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!Number.isFinite(data.amountPence) || data.amountPence < 100) {
      throw new Error("Payment amount must be at least £1.00");
    }
    if (!/^[A-Za-z0-9-]{3,40}$/.test(data.bookingRef)) throw new Error("Invalid booking reference");
    return { ...data, amountPence: Math.round(data.amountPence) };
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "gbp",
            unit_amount: data.amountPence,
            product_data: { name: `Cabslink booking ${data.bookingRef}` },
          },
          quantity: 1,
        }],
        payment_intent_data: { description: `Cabslink booking ${data.bookingRef}` },
        ...(data.email ? { customer_email: data.email } : {}),
        metadata: { booking_ref: data.bookingRef },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
