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

/**
 * Checkout started from the public "track your booking" page. The amount is
 * read from the saved booking server-side, so the fare is never exposed to (or
 * accepted from) the client, and already-paid bookings are refused.
 */
export const createTrackedBookingCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { bookingRef: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[A-Za-z0-9-]{3,40}$/.test(data.bookingRef)) throw new Error("Invalid booking reference");
    return data;
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const ref = data.bookingRef.toUpperCase();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const res: any = await supabaseAdmin
        .from("bookings")
        .select("price, quoted_total, quote_expires_at, email, payment_status")
        .eq("booking_ref", ref)
        .maybeSingle();
      if (res.error || !res.data) return { error: "We couldn't find that booking." };
      if (res.data.payment_status === "paid") return { error: "This booking is already paid." };
      // Tours are held unpaid with the server-calculated quote; that figure is
      // payable until the hold expires.
      if (
        res.data.price == null &&
        res.data.quote_expires_at &&
        new Date(res.data.quote_expires_at).getTime() < Date.now()
      ) {
        return { error: "This quote has expired. Please build your tour again to get a fresh price." };
      }
      const pence = Math.round(Number(res.data.price ?? res.data.quoted_total ?? 0) * 100);
      if (!Number.isFinite(pence) || pence < 100) {
        return { error: "This booking has no payable fare yet. Please contact us." };
      }

      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "gbp",
            unit_amount: pence,
            product_data: { name: `Cabslink booking ${ref}` },
          },
          quantity: 1,
        }],
        payment_intent_data: { description: `Cabslink booking ${ref}` },
        ...(res.data.email ? { customer_email: res.data.email as string } : {}),
        metadata: { booking_ref: ref },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type PaymentConfirmResult =
  | { paid: boolean; status: string; paymentStatus: string }
  | { error: string };

/**
 * Verifies a completed Stripe Checkout session against the saved booking and
 * only then marks the booking paid + confirmed. The booking is never treated
 * as confirmed on the strength of a redirect alone.
 */
export const confirmBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; bookingRef: string; environment: StripeEnv }) => {
    if (!/^cs_[A-Za-z0-9_-]{10,200}$/.test(data.sessionId)) throw new Error("Invalid session");
    if (!/^[A-Za-z0-9-]{3,40}$/.test(data.bookingRef)) throw new Error("Invalid booking reference");
    return data;
  })
  .handler(async ({ data }): Promise<PaymentConfirmResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const ref = (session.metadata?.booking_ref ?? "").toUpperCase();
      if (ref !== data.bookingRef.toUpperCase()) return { error: "This payment does not match the booking." };
      const paid = session.payment_status === "paid";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (paid) {
        const upd: any = await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "paid", status: "confirmed" } as any)
          .eq("booking_ref", data.bookingRef.toUpperCase())
          .select("status, payment_status")
          .maybeSingle();
        if (upd.error) return { error: "Payment received, but the booking could not be updated. Please contact us." };
        return { paid: true, status: upd.data?.status ?? "confirmed", paymentStatus: upd.data?.payment_status ?? "paid" };
      }

      const cur: any = await supabaseAdmin
        .from("bookings")
        .select("status, payment_status")
        .eq("booking_ref", data.bookingRef.toUpperCase())
        .maybeSingle();
      return {
        paid: false,
        status: cur?.data?.status ?? "new",
        paymentStatus: cur?.data?.payment_status ?? "unpaid",
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
