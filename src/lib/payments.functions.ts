import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export type CheckoutResult = { clientSecret: string; environment: StripeEnv } | { error: string };

/**
 * Public checkout input. Only the booking reference and where Stripe should
 * send the customer back are accepted: amount, email and Stripe environment
 * are decided on the server. Unknown keys (e.g. a forged `amountPence`) are
 * stripped, never read.
 */
export const checkoutInputSchema = z.object({
  bookingRef: z.string().regex(/^[A-Za-z0-9-]{3,40}$/, "Invalid booking reference"),
  returnUrl: z.string().url().max(500),
});

export const confirmInputSchema = z.object({
  sessionId: z.string().regex(/^cs_[A-Za-z0-9_-]{10,200}$/, "Invalid session"),
  bookingRef: z.string().regex(/^[A-Za-z0-9-]{3,40}$/, "Invalid booking reference"),
});

/** The server alone picks live vs sandbox, from the host serving the request. */
async function serverStripeEnv(): Promise<StripeEnv> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { resolveStripeEnvForHost, hostFromRequest } = await import("@/lib/stripe-payments.server");
  return resolveStripeEnvForHost(hostFromRequest(getRequest()));
}

async function startCheckout(data: z.infer<typeof checkoutInputSchema>): Promise<CheckoutResult> {
  try {
    const env = await serverStripeEnv();
    const { createCheckoutForBooking, defaultPaymentDeps } = await import("@/lib/stripe-payments.server");
    return await createCheckoutForBooking(
      { bookingRef: data.bookingRef, returnUrl: data.returnUrl, env, stripe: createStripeClient(env) },
      await defaultPaymentDeps(),
    );
  } catch (error) {
    return { error: getStripeErrorMessage(error) };
  }
}

/** Card-only checkout for a saved booking; the fare is read from the booking. */
export const createBookingCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInputSchema.parse(data))
  .handler(({ data }) => startCheckout(data));

/** Checkout started from the public "track your booking" page. Same rules. */
export const createTrackedBookingCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInputSchema.parse(data))
  .handler(({ data }) => startCheckout(data));

export type PaymentConfirmResult =
  | { paid: boolean; status: string; paymentStatus: string }
  | { error: string };

/**
 * Verifies a completed Stripe Checkout session against the saved booking and
 * only then marks it paid. A redirect alone is never treated as payment.
 */
export const confirmBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => confirmInputSchema.parse(data))
  .handler(async ({ data }): Promise<PaymentConfirmResult> => {
    try {
      const env = await serverStripeEnv();
      const stripe = createStripeClient(env);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const ref = (session.metadata?.booking_ref ?? "").toUpperCase();
      if (ref !== data.bookingRef.toUpperCase()) return { error: "This payment does not match the booking." };

      const { applyPaidSession, defaultPaymentDeps } = await import("@/lib/stripe-payments.server");
      const res = await applyPaidSession({ session, env, stripe }, await defaultPaymentDeps());
      if (res.applied) return { paid: true, status: res.status, paymentStatus: res.paymentStatus };
      if (res.reason === "update_failed") {
        return { error: "Payment received, but the booking could not be updated. Please contact us." };
      }
      return { paid: res.paymentStatus === "paid", status: res.status ?? "new", paymentStatus: res.paymentStatus ?? "unpaid" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
