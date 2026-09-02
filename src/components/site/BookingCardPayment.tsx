import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { getStripe, getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { createBookingCheckout } from "@/lib/payments.functions";

/** Card-only Stripe checkout, rendered inline once a booking has a reference. */
export function BookingCardPayment({
  amountPence,
  bookingRef,
  email,
  returnUrl,
}: {
  amountPence: number;
  bookingRef: string;
  email?: string;
  returnUrl: string;
}) {
  const checkoutFn = useServerFn(createBookingCheckout);

  if (!paymentsConfigured()) {
    return (
      <div className="rounded-2xl border border-border bg-[var(--surface)] p-5 text-sm text-muted-foreground">
        Card payment is not available in this environment yet. Our team will contact you to take
        payment for booking <span className="font-semibold text-foreground">{bookingRef}</span>.
      </div>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const res = await checkoutFn({
      data: { amountPence, bookingRef, email, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("Payment could not be started. Please try again.");
    return res.clientSecret;
  };

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="size-4 text-[var(--gold-ink)]" />
        Secure card payment — Visa, Mastercard and American Express.
      </p>
      <div id="checkout" className="rounded-2xl border border-border bg-background p-2 md:p-4">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
