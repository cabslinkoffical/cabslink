import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, CalendarDays, Car, CheckCircle2, Clock, Luggage, Mail, MapPin, Phone,
  CreditCard, Route as RouteIcon, ShieldCheck, User, XCircle, Info, Briefcase, PlaneTakeoff, MessageCircle,
  PencilLine, RefreshCw,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNotice, FormField, focusFirstInvalid } from "@/components/site/FormValidation";
import { SITE } from "@/lib/site";
import { statusLabel, type BookingStatus } from "@/lib/booking-lifecycle";
import {
  findMyBooking, requestBookingCancellation, CANCELLATION_REASONS, type ManagedBooking,
  quoteBookingAmendment, submitBookingAmendment,
  type AmendChanges, type AmendmentQuote, type AmendmentResult,
} from "@/lib/manage-booking.functions";
import { confirmBookingPayment } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { TrackedBookingPayment } from "@/components/site/TrackedBookingPayment";


export const Route = createFileRoute("/manage-booking")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string; ref?: string } => ({
    ...(typeof search.session_id === "string" ? { session_id: search.session_id } : {}),
    ...(typeof search.ref === "string" ? { ref: search.ref } : {}),
  }),

  head: () => ({
    meta: [
      { title: `Track my booking — ${SITE.name}` },
      { name: "description", content: "Track your Cabslink journey in real time. Verify with your last name and booking reference or email, then request cancellation if needed." },
      { property: "og:title", content: `Track my booking — ${SITE.name}` },
      { property: "og:description", content: "Look up your Cabslink booking status with your last name and reference or email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/manage-booking" }],
  }),
  component: ManageBookingPage,
});

type Mode = "track" | "cancel" | "pay";

function ManageBookingPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>("track");
  const confirmFn = useServerFn(confirmBookingPayment);
  const [payConfirm, setPayConfirm] = useState<
    { state: "checking" } | { state: "paid"; ref: string } | { state: "failed"; message: string } | null
  >(search.session_id && search.ref ? { state: "checking" } : null);

  useEffect(() => {
    const sessionId = search.session_id;
    const ref = search.ref;
    if (!sessionId || !ref) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await confirmFn({
          data: { sessionId, bookingRef: ref, environment: getStripeEnvironment() },
        });
        if (cancelled) return;
        if ("error" in res) setPayConfirm({ state: "failed", message: res.error });
        else if (res.paid) setPayConfirm({ state: "paid", ref });
        else setPayConfirm({ state: "failed", message: "Your payment was not completed. Please try again." });
      } catch (err: any) {
        if (!cancelled) setPayConfirm({ state: "failed", message: err?.message ?? "We couldn't verify that payment." });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.session_id, search.ref]);


  // Identity
  const [bookingRef, setBookingRef] = useState("");
  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<ManagedBooking | null>(null);

  // Cancellation
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [cancelAttempted, setCancelAttempted] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [submitted, setSubmitted] = useState<{ ref: string; tier: string } | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);
  const lookupFn = useServerFn(findMyBooking);
  const cancelFn = useServerFn(requestBookingCancellation);

  const idErrors = {
    lastName: !lastName.trim()
      ? "Enter the last name used on the booking."
      : lastName.trim().length < 2
      ? "Last name must be at least 2 characters."
      : "",
    bookingRef:
      !bookingRef.trim() && !email.trim() ? "Enter your booking reference or the email you booked with." : "",
    email:
      email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? "Enter a valid email address." : "",
  };
  const idInvalid = Object.values(idErrors).some(Boolean);

  const submitLookup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttempted(true);
    setError(null);
    if (idInvalid) {
      focusFirstInvalid(e.currentTarget);
      return;
    }
    setLoading(true);
    setBooking(null);
    setSubmitted(null);
    try {
      const data = await lookupFn({
        data: { bookingRef: bookingRef.trim().toUpperCase(), email: email.trim(), lastName: lastName.trim() },
      });
      setBooking(data);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitCancellation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCancelAttempted(true);
    setCancelError(null);
    if (!reason || (reason === "Other" && details.trim().length < 3)) {
      focusFirstInvalid(e.currentTarget);
      return;
    }

    setCancelling(true);
    try {
      const res = await cancelFn({
        data: {
          bookingRef: bookingRef.trim().toUpperCase(),
          email: email.trim(),
          lastName: lastName.trim(),
          reason: reason as (typeof CANCELLATION_REASONS)[number],
          details: details.trim(),
          callbackPhone: "",
        },
      });
      setSubmitted({ ref: res.bookingRef, tier: res.tier });
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err: any) {
      setCancelError(err?.message ?? "We couldn't submit that request. Please call us instead.");
    } finally {
      setCancelling(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setCancelError(null);
    setCancelAttempted(false);
  };

  return (
    <SiteLayout>
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[var(--gold)]">
            <ArrowLeft className="size-4" /> Back to home
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-card shadow-raised">
            <div className="bg-[var(--navy)] px-6 py-6 text-[var(--navy-foreground)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">{SITE.name}</p>
              <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">Track my booking</h1>
              <p className="mt-1.5 text-sm text-white/70">
                Enter your last name and either your booking reference or the email you booked with. Once we find your booking,
                you can request a cancellation from the same page.
              </p>
            </div>

            <form onSubmit={submitLookup} className="space-y-5 p-6" noValidate>
              <FormNotice visible={attempted && (idInvalid || !!error)}>
                {error ?? "Please fill the required data to continue"}
              </FormNotice>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Booking reference" htmlFor="mb-ref" error={attempted ? idErrors.bookingRef : ""}>
                  <Input
                    id="mb-ref"
                    value={bookingRef}
                    onChange={(e) => { setBookingRef(e.target.value.toUpperCase()); setError(null); }}
                    placeholder="e.g. CL-260830-A3B9"
                    autoComplete="off"
                    className="font-mono uppercase"
                  />
                </FormField>
                <FormField label="Or the email you booked with" htmlFor="mb-email" error={attempted ? idErrors.email : ""}>
                  <Input
                    id="mb-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </FormField>
              </div>

              <FormField label="Last name on the booking (required)" htmlFor="mb-last" error={attempted ? idErrors.lastName : ""}>
                <Input
                  id="mb-last"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setError(null); }}
                  placeholder="e.g. Ahmed"
                  autoComplete="family-name"
                />
              </FormField>

              <Button type="submit" disabled={loading} className="w-full gap-2 bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)]/90">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-[var(--navy)]/30 border-t-[var(--navy)]" /> Checking…
                  </span>
                ) : (
                  <><ShieldCheck className="size-4" /> Find my booking</>
                )}
              </Button>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--gold-ink)]" />
                We only ever show a booking when the last name matches, so nobody else can look up your journey.
              </p>
            </form>
          </div>

          {/* Payment return banner */}
          {payConfirm ? (
            <div
              className={`mt-6 rounded-2xl border p-5 shadow-raised ${
                payConfirm.state === "paid"
                  ? "border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]"
                  : "border-[var(--navy)]/10 bg-card"
              }`}
            >
              {payConfirm.state === "checking" ? (
                <p className="text-sm font-semibold">Confirming your payment…</p>
              ) : payConfirm.state === "paid" ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 className="size-4 text-[var(--gold-ink)]" /> Payment received — booking {payConfirm.ref} is confirmed.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A confirmation email is on its way. Look your booking up below to see the updated status.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-destructive">{payConfirm.message}</p>
              )}
            </div>
          ) : null}

          {/* Result */}
          <div ref={resultRef} className="scroll-mt-24">
            {submitted ? (
              <CancellationDone ref_={submitted.ref} tier={submitted.tier} registeredPhone={booking?.phone ?? null} />

            ) : booking ? (
              <>
                {isClosed(booking) && <ClosedNotice booking={booking} />}
                <BookingCard booking={booking} />

                {mode === "pay" && (
                  <div className="mt-4 rounded-2xl border border-[var(--gold)]/40 bg-card p-5 shadow-raised">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold">Pay for booking {booking.bookingRef}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.price != null ? `Amount due £${booking.price.toFixed(2)}` : "Amount due as quoted"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => switchMode("track")}
                        className="gap-2 text-[var(--gold-ink)] hover:bg-transparent hover:text-[var(--gold-ink)]/80"
                      >
                        <ArrowLeft className="size-4" /> Back to booking details
                      </Button>
                    </div>
                    <TrackedBookingPayment
                      bookingRef={booking.bookingRef}
                      returnUrl={`${typeof window !== "undefined" ? window.location.origin : "https://cabslink.com"}/manage-booking?ref=${encodeURIComponent(booking.bookingRef)}&session_id={CHECKOUT_SESSION_ID}`}
                    />
                  </div>
                )}
                {mode === "track" && booking.cancellation.requested && !isClosed(booking) && (
                  <div className="mt-4 rounded-2xl border border-[var(--navy)]/15 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] p-5 shadow-raised">
                    <p className="font-display text-lg font-bold">Cancellation requested</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We've received your cancellation request{booking.cancellation.requestedAt ? ` on ${new Date(booking.cancellation.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}. Our team is reviewing it and will confirm by email. Nothing further is needed from you.
                    </p>
                    <div className="mt-4">
                      <Button asChild variant="ghost" className="gap-2 pl-0 text-[var(--gold-ink)] hover:bg-transparent hover:text-[var(--gold-ink)]/80">
                        <a href={`tel:${SITE.phoneUK.replace(/\s+/g, "")}`}>
                          <Phone className="size-4" /> Call {SITE.phoneUK}
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
                {mode === "track" && !booking.cancellation.requested && needsPayment(booking) && (

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] p-5 shadow-raised">
                    <div>
                      <p className="text-sm font-bold">Payment outstanding</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.paymentStatus === "partial"
                          ? "Part of this fare is still unpaid. Settle the balance to secure your vehicle."
                          : booking.paymentStatus === "failed"
                          ? "Your last card payment did not go through. Please try again to secure your vehicle."
                          : "This booking is not paid yet. Pay now by card to confirm your journey."}
                      </p>
                    </div>
                    <Button onClick={() => switchMode("pay")} className="gap-2 bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)]/90">
                      <CreditCard className="size-4" /> Pay now
                    </Button>
                  </div>
                )}

                {mode === "cancel" && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => switchMode("track")}
                      className="mt-4 gap-2 pl-0 text-[var(--gold-ink)] hover:bg-transparent hover:text-[var(--gold-ink)]/80"
                    >
                      <ArrowLeft className="size-4" /> Back to booking details
                    </Button>
                    <CancelForm
                      booking={booking}
                      reason={reason}
                      setReason={setReason}
                      details={details}
                      setDetails={setDetails}
                      attempted={cancelAttempted}
                      error={cancelError}
                      submitting={cancelling}
                      onSubmit={submitCancellation}
                    />
                  </>
                )}
                {mode === "track" && booking.cancellation.allowed && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--navy)]/10 bg-card p-5 shadow-raised">
                    <p className="text-sm text-muted-foreground">Need to cancel this journey?</p>
                    <Button variant="outline" onClick={() => switchMode("cancel")} className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <XCircle className="size-4" /> Cancel this booking
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--navy)]/10 bg-card p-5 text-sm shadow-raised">
            <p className="font-semibold">Prefer to speak to someone?</p>
            <p className="mt-1 text-muted-foreground">Our team is available 24/7 for changes, cancellations and refunds.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-4 py-2 text-xs font-bold text-[var(--navy-foreground)]">
                <Phone className="size-3.5" /> {SITE.phoneUK}
              </a>
              <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--navy)]/15 px-4 py-2 text-xs font-bold">
                <Mail className="size-3.5" /> {SITE.email}
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function needsPayment(b: ManagedBooking) {
  return !isClosed(b) && (b.paymentStatus === "unpaid" || b.paymentStatus === "failed" || b.paymentStatus === "partial");
}

/** Cancelled, rejected or completed bookings can't be changed or paid for. */
function isClosed(b: ManagedBooking) {
  return b.status === "cancelled" || b.status === "rejected" || b.status === "completed";
}

/** Explains a closed booking and offers a fresh booking instead. */
function ClosedNotice({ booking: b }: { booking: ManagedBooking }) {
  const cancelled = b.status === "cancelled";
  const rejected = b.status === "rejected";
  const heading = cancelled
    ? "This booking is cancelled"
    : rejected
    ? "This booking was not accepted"
    : "This journey is complete";
  const detail = cancelled
    ? "Nothing further is needed from you. If you still need this journey, you can book a new one in a couple of minutes."
    : rejected
    ? `We weren't able to take this journey on. Book again with different details, or call us on ${SITE.phoneUK} and we'll help.`
    : "Thanks for travelling with us. Your journey details stay here for your records.";

  return (
    <div className="mt-6 rounded-2xl border border-[var(--navy)]/15 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] p-5 shadow-raised">
      <p className="font-display text-lg font-bold">{heading}</p>
      {b.cancellationReason && cancelled && (
        <p className="mt-1 text-sm text-muted-foreground">Reason recorded: {b.cancellationReason}</p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      {b.paymentStatus === "refunded" && (
        <p className="mt-1 text-sm text-muted-foreground">Your refund has been issued back to the card you paid with.</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button asChild className="gap-2 bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)]/90">
          <Link to="/book">Book a new journey</Link>
        </Button>
        <Button asChild variant="ghost" className="text-[var(--gold-ink)] hover:bg-transparent hover:text-[var(--gold-ink)]/80">
          <a href={`tel:${SITE.phoneUK.replace(/\s+/g, "")}`}>Call {SITE.phoneUK}</a>
        </Button>
      </div>
    </div>
  );
}


function BookingCard({ booking: b }: { booking: ManagedBooking }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-card shadow-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-6 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Booking reference</p>
          <p className="font-mono text-lg font-bold tracking-wider">{b.bookingRef}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={toneForStatus(b.status)}>{statusLabel(b.status as BookingStatus)}</Badge>
          <Badge tone={b.paymentStatus === "paid" ? "green" : b.paymentStatus === "refunded" || b.paymentStatus === "failed" ? "red" : "gold"}>
            {b.paymentStatus === "paid" ? "Paid" : b.paymentStatus === "partial" ? "Part paid" : b.paymentStatus === "refunded" ? "Refunded" : b.paymentStatus === "failed" ? "Payment failed" : "Unpaid"}
          </Badge>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="size-2.5 rounded-full bg-[var(--gold)]" />
            <span className="my-1 w-px flex-1 bg-[var(--navy)]/20" />
            <MapPin className="size-3.5 text-[var(--navy)]" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
              <p className="text-sm font-semibold break-words">{b.pickupAddress}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Destination</p>
              <p className="text-sm font-semibold break-words">{b.dropoffAddress}</p>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Fact icon={<CalendarDays className="size-3" />} label="Date" value={b.pickupDate} />
          <Fact icon={<Clock className="size-3" />} label="Time" value={b.pickupTime} />
          <Fact icon={<Car className="size-3" />} label="Vehicle" value={b.vehicleType ?? "—"} />
          <Fact icon={<User className="size-3" />} label="Passengers" value={String(b.passengers)} />
          <Fact icon={<Luggage className="size-3" />} label="Suitcases" value={String(b.luggage)} />
          <Fact icon={<Briefcase className="size-3" />} label="Hand bags" value={String(b.handLuggage)} />
          <Fact icon={<RouteIcon className="size-3" />} label="Distance" value={b.distanceMiles != null ? `${b.distanceMiles.toFixed(1)} mi` : "—"} />
          {b.flightNumber ? <Fact icon={<PlaneTakeoff className="size-3" />} label="Flight" value={b.flightNumber} /> : null}
          <Fact icon={<ShieldCheck className="size-3" />} label="Total fare" value={b.price != null ? `£${b.price.toFixed(2)}` : "—"} />
        </dl>

        {b.cancellationReason ? (
          <p className="rounded-xl bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] p-3 text-xs font-semibold text-destructive">
            Cancellation note: {b.cancellationReason}
          </p>
        ) : null}

        <div className={`rounded-xl border p-4 ${b.cancellation.allowed ? "border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)]" : "border-[var(--navy)]/10 bg-[var(--surface-2)]"}`}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
            {b.cancellation.allowed ? b.cancellation.policyLabel : "Cancellation"}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {b.cancellation.allowed ? b.cancellation.policyDetail : b.cancellation.blockedReason}
          </p>
          {b.cancellation.allowed && b.cancellation.hoursUntilPickup != null && (
            <p className="mt-2 text-xs font-semibold text-[var(--navy)]">
              {b.cancellation.hoursUntilPickup >= 24
                ? `${Math.floor(b.cancellation.hoursUntilPickup)} hours until pickup`
                : `Only ${Math.max(0, Math.floor(b.cancellation.hoursUntilPickup))} hours until pickup`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelForm({
  booking, reason, setReason, details, setDetails, attempted, error, submitting, onSubmit,
}: {
  booking: ManagedBooking;
  reason: string;
  setReason: (v: string) => void;
  details: string;
  setDetails: (v: string) => void;
  attempted: boolean;
  error: string | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!booking.cancellation.allowed) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--navy)]/10 bg-card p-6 shadow-raised">
        <p className="text-sm font-semibold">This booking can't be cancelled online</p>
        <p className="mt-1 text-sm text-muted-foreground">{booking.cancellation.blockedReason}</p>
        <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-4 py-2 text-xs font-bold text-[var(--navy-foreground)]">
          <Phone className="size-3.5" /> Call {SITE.phoneUK}
        </a>
      </div>
    );
  }

  const unpaid = booking.cancellation.tier === "unpaid";

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 overflow-hidden rounded-2xl border border-destructive/25 bg-card shadow-raised">
      <div className="border-b border-destructive/15 bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)] px-6 py-4">
        <p className="font-display text-lg font-bold">Cancel booking {booking.bookingRef}</p>
        {unpaid ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] p-3.5 shadow-sm">
            <Info className="mt-0.5 size-5 shrink-0 text-[var(--gold-ink)]" />
            <div>
              <p className="text-sm font-bold text-[var(--navy)]">
                No payment has been taken for this booking, so there is nothing to refund — cancelling is free.
              </p>
              <p className="mt-0.5 text-xs text-[var(--navy)]/80">
                Your booking is still unpaid, so you can cancel without any charge.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.cancellation.tier === "full"
              ? "You qualify for a full refund of anything already paid."
              : "You can submit a partial-refund claim — our team confirms the amount by email."}
          </p>
        )}
      </div>

      <div className="space-y-5 p-6">
        <FormNotice visible={attempted && (!reason || !!error)}>{error ?? "Please choose a reason to continue"}</FormNotice>

        <FormField label="Reason for cancelling" htmlFor="mb-reason" error={attempted && !reason ? "Choose a reason." : ""}>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="mb-reason"><SelectValue placeholder="Select a reason" /></SelectTrigger>
            <SelectContent>
              {CANCELLATION_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label={reason === "Other" ? "Please tell us your reason" : "Anything else we should know? (optional)"}
          htmlFor="mb-details"
          error={attempted && reason === "Other" && details.trim().length < 3 ? "Please write your reason." : ""}
        >
          <Textarea id="mb-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={600} rows={3} aria-invalid={attempted && reason === "Other" && details.trim().length < 3} placeholder={reason === "Other" ? "Tell us briefly why you're cancelling" : booking.cancellation.tier === "unpaid" ? "Optional — a short note helps our team." : "Optional — a short note helps us process your refund faster."} />
        </FormField>


        <div className="rounded-xl border border-[var(--navy)]/12 bg-[var(--surface-2)] p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
            <Phone className="size-3.5 text-[var(--gold-ink)]" /> We'll call you on your registered number
          </p>
          <p className="mt-1.5 font-mono text-sm font-bold">{maskPhone(booking.phone)}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            For your security we only show part of the number here. We only discuss this booking on the number you gave when booking — if it
            has changed, please call us from it or email {SITE.email} so we can update it.
          </p>
        </div>

        <Button type="submit" disabled={submitting} variant="destructive" className="w-full gap-2">
          {submitting ? "Submitting…" : <><XCircle className="size-4" /> Submit cancellation request</>}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Submitting sends the request to our operations team straight away. You'll get an email confirmation, and our team
          calls your registered number within 24 hours.
        </p>

      </div>
    </form>
  );
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "••••••••••••";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("44") && digits.length > 2) {
    return `+44${"•".repeat(Math.max(6, digits.length - 2))}`;
  }
  const match = phone.match(/^(\+\d{2})/);
  if (match) return `${match[1]}${"•".repeat(Math.max(6, digits.length - 2))}`;
  return "•".repeat(Math.max(8, digits.length));
}

function CancellationDone({ ref_, tier, registeredPhone }: { ref_: string; tier: string; registeredPhone: string | null }) {
  const waNumber = SITE.phoneUK.replace(/[^\d]/g, "");
  const waText = encodeURIComponent(
    `Hello Cabslink, I have submitted a cancellation request for booking ${ref_}. I am messaging from the number registered on the booking. Please confirm the cancellation.`,
  );
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-card shadow-raised">
      <div className="bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-6 py-6 text-center">
        <CheckCircle2 className="mx-auto size-9 text-[var(--gold-ink)]" />
        <h2 className="mt-2 font-display text-xl font-bold">Cancellation request received</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference <span className="font-mono font-bold">{ref_}</span> —{" "}
          {tier === "full"
            ? "logged for a full refund."
            : tier === "partial"
            ? "logged as a partial-refund claim."
            : "logged for cancellation."}
        </p>
        {tier === "unpaid" && (
          <div className="mx-auto mt-4 flex max-w-lg items-start gap-3 rounded-xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] p-3.5 text-left shadow-sm">
            <Info className="mt-0.5 size-5 shrink-0 text-[var(--gold-ink)]" />
            <p className="text-sm font-bold text-[var(--navy)]">
              No payment has been taken for this booking, so there is nothing to refund — cancelling is free.
            </p>
          </div>
        )}
      </div>
      <div className="space-y-4 p-6 text-sm">
        <ol className="space-y-2 text-muted-foreground">
          <li><span className="font-semibold text-foreground">1.</span> Our team calls you on your registered number{registeredPhone ? <> (<span className="font-mono font-semibold text-foreground">{maskPhone(registeredPhone)}</span>)</> : null} within 24 hours to confirm it is really you.</li>
          <li><span className="font-semibold text-foreground">2.</span> You receive a confirmation email once the booking is cancelled.</li>
          {tier === "unpaid" ? (
            <li><span className="font-semibold text-foreground">3.</span> Nothing will be charged to your card — no payment was taken for this booking.</li>
          ) : (
            <li><span className="font-semibold text-foreground">3.</span> Any refund is returned to your original payment method, typically in 5–10 working days.</li>
          )}
        </ol>

        <div className="rounded-xl border border-[var(--gold)]/35 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] p-4">
          <p className="font-semibold">In a hurry? Confirm it yourself now</p>
          <p className="mt-1 text-xs text-muted-foreground">
            For security, contact us <span className="font-semibold text-foreground">from the same number you used when booking</span>
            {registeredPhone ? <> (<span className="font-mono font-semibold text-foreground">{maskPhone(registeredPhone)}</span>)</> : null}. Messages or calls from
            another number can't be used to confirm a cancellation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-[var(--navy-foreground)]"
            >
              <MessageCircle className="size-4" /> Confirm on WhatsApp
            </a>
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--navy)]/20 px-4 py-2.5 text-sm font-bold"
            >
              <Phone className="size-4" /> Call {SITE.phoneUK}
            </a>
          </div>
        </div>

        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gold-ink)]">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
      </div>

    </div>
  );
}

function toneForStatus(status: string): "green" | "red" | "gold" | "blue" {
  if (status === "confirmed" || status === "completed") return "green";
  if (status === "cancelled" || status === "rejected") return "red";
  if (status === "driver_en_route" || status === "passenger_on_board" || status === "on_way") return "gold";
  return "blue";
}

function Badge({ tone, children }: { tone: "green" | "red" | "gold" | "blue"; children: React.ReactNode }) {
  const cls =
    tone === "green" ? "bg-emerald-100 text-emerald-800"
    : tone === "red" ? "bg-red-100 text-red-800"
    : tone === "gold" ? "bg-[var(--gold)]/25 text-[var(--navy)]"
    : "bg-blue-100 text-blue-800";
  return <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${cls}`}>{children}</span>;
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-[var(--gold-ink)]">{icon}</span>{label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold" title={value}>{value}</dd>
    </div>
  );
}
