import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { getStripe, getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { createTrackedBookingCheckout } from "@/lib/payments.functions";

/**
 * Card-only checkout for a booking found through the tracking page. The fare is
 * resolved server-side from the booking reference, so no amount is trusted from
 * the browser.
 */
export function TrackedBookingPayment({
  bookingRef,
  returnUrl,
}: {
  bookingRef: string;
  returnUrl: string;
}) {
  const checkoutFn = useServerFn(createTrackedBookingCheckout);

  if (!paymentsConfigured()) {
    return (
      <div className="rounded-xl border border-border bg-[var(--surface-2)] p-4 text-sm text-muted-foreground">
        Card payment is not available in this environment yet. Our team will contact you to take
        payment for booking <span className="font-semibold text-foreground">{bookingRef}</span>.
      </div>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const res = await checkoutFn({
      data: { bookingRef, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("Payment could not be started. Please try again.");
    return res.clientSecret;
  };

  return (
    <div className="space-y-3">
      {import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN?.startsWith("pk_test_") && (
        <p className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-2 text-xs font-medium text-foreground">
          Test mode — card payments made here are not real charges.
        </p>
      )}
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
