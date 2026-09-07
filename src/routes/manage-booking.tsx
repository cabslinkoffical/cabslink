import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  ArrowLeft, CalendarDays, Car, CheckCircle2, Clock, Luggage, Mail, MapPin, Phone,
  Route as RouteIcon, Search, ShieldCheck, User, XCircle, Info, Briefcase, PlaneTakeoff,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNotice, FormField, focusFirstInvalid } from "@/components/site/FormValidation";
import { SITE } from "@/lib/site";
import { statusLabel, type BookingStatus } from "@/lib/booking-lifecycle";
import {
  findMyBooking, requestBookingCancellation, CANCELLATION_REASONS, type ManagedBooking,
} from "@/lib/manage-booking.functions";

export const Route = createFileRoute("/manage-booking")({
  validateSearch: (search: Record<string, unknown>): { tab?: "track" | "cancel" } =>
    search.tab === "cancel" ? { tab: "cancel" } : {},
  head: () => ({
    meta: [
      { title: `Manage your booking — track or cancel — ${SITE.name}` },
      { name: "description", content: "Track your Cabslink journey or request a cancellation. Verify with your last name plus your booking reference or email — full refund up to 24 hours before pickup." },
      { property: "og:title", content: `Manage your booking — ${SITE.name}` },
      { property: "og:description", content: "Track your journey status or request a cancellation and refund in a couple of steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/manage-booking" }],
  }),
  component: ManageBookingPage,
});

type Mode = "track" | "cancel";

function ManageBookingPage() {
  const { tab } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(tab === "cancel" ? "cancel" : "track");

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
  const [callbackPhone, setCallbackPhone] = useState("");
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
    if (!reason) {
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
          callbackPhone: callbackPhone.trim(),
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
              <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">Manage your booking</h1>
              <p className="mt-1.5 text-sm text-white/70">
                Check your live journey status or request a cancellation. Your last name is always required, plus either your
                booking reference or the email you booked with.
              </p>
            </div>

            {/* Mode switch */}
            <div className="flex gap-1 border-b border-[var(--navy)]/10 bg-[color-mix(in_oklab,var(--navy)_4%,transparent)] p-2">
              <ModeTab active={mode === "track"} onClick={() => switchMode("track")} icon={<Search className="size-4" />}>
                Track my booking
              </ModeTab>
              <ModeTab active={mode === "cancel"} onClick={() => switchMode("cancel")} icon={<XCircle className="size-4" />}>
                Cancel a booking
              </ModeTab>
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
                  <><ShieldCheck className="size-4" /> {mode === "cancel" ? "Find booking to cancel" : "Find my booking"}</>
                )}
              </Button>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--gold-ink)]" />
                We only ever show a booking when the last name matches, so nobody else can look up your journey.
              </p>
            </form>
          </div>

          {/* Result */}
          <div ref={resultRef} className="scroll-mt-24">
            {submitted ? (
              <CancellationDone ref_={submitted.ref} tier={submitted.tier} registeredPhone={booking?.phone ?? null} />

            ) : booking ? (
              <>
                <BookingCard booking={booking} />
                {mode === "cancel" && (
                  <CancelForm
                    booking={booking}
                    reason={reason}
                    setReason={setReason}
                    details={details}
                    setDetails={setDetails}
                    callbackPhone={callbackPhone}
                    setCallbackPhone={setCallbackPhone}
                    attempted={cancelAttempted}
                    error={cancelError}
                    submitting={cancelling}
                    onSubmit={submitCancellation}
                  />
                )}
                {mode === "track" && booking.cancellation.allowed && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--navy)]/10 bg-card p-5 shadow-raised">
                    <p className="text-sm text-muted-foreground">Need to cancel this journey?</p>
                    <Button variant="outline" onClick={() => switchMode("cancel")} className="gap-2">
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

function ModeTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-[var(--navy)] text-[var(--navy-foreground)] shadow-sm"
          : "text-[var(--navy)]/70 hover:bg-white hover:text-[var(--navy)]"
      }`}
    >
      {icon}
      {children}
    </button>
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
  booking, reason, setReason, details, setDetails, callbackPhone, setCallbackPhone, attempted, error, submitting, onSubmit,
}: {
  booking: ManagedBooking;
  reason: string;
  setReason: (v: string) => void;
  details: string;
  setDetails: (v: string) => void;
  callbackPhone: string;
  setCallbackPhone: (v: string) => void;
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

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 overflow-hidden rounded-2xl border border-destructive/25 bg-card shadow-raised">
      <div className="border-b border-destructive/15 bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)] px-6 py-4">
        <p className="font-display text-lg font-bold">Cancel booking {booking.bookingRef}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.cancellation.tier === "unpaid"
            ? "No payment has been taken for this booking, so there is nothing to refund — cancelling is free."
            : booking.cancellation.tier === "full"
            ? "You qualify for a full refund of anything already paid."
            : "You can submit a partial-refund claim — our team confirms the amount by email."}
        </p>
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

        <FormField label="Anything else we should know? (optional)" htmlFor="mb-details">
          <Textarea id="mb-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={600} rows={3} placeholder={booking.cancellation.tier === "unpaid" ? "Optional — a short note helps our team." : "Optional — a short note helps us process your refund faster."} />
        </FormField>

        <FormField label="Best number to call you back (optional)" htmlFor="mb-phone">
          <Input id="mb-phone" value={callbackPhone} onChange={(e) => setCallbackPhone(e.target.value)} placeholder={booking.phone ?? "+44 …"} autoComplete="tel" />
        </FormField>

        <Button type="submit" disabled={submitting} variant="destructive" className="w-full gap-2">
          {submitting ? "Submitting…" : <><XCircle className="size-4" /> Submit cancellation request</>}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Submitting sends the request to our operations team straight away. You'll get an email confirmation, and you can
          call us on {SITE.phoneUK} at any point.
        </p>
      </div>
    </form>
  );
}

function CancellationDone({ ref_, tier }: { ref_: string; tier: string }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-card shadow-raised">
      <div className="bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-6 py-6 text-center">
        <CheckCircle2 className="mx-auto size-9 text-[var(--gold-ink)]" />
        <h2 className="mt-2 font-display text-xl font-bold">Cancellation request received</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference <span className="font-mono font-bold">{ref_}</span> —{" "}
          {tier === "unpaid"
            ? "logged for cancellation. No payment was taken, so there is nothing to refund."
            : tier === "full"
            ? "logged for a full refund."
            : "logged as a partial-refund claim."}
        </p>
      </div>
      <div className="space-y-4 p-6 text-sm">
        <ol className="space-y-2 text-muted-foreground">
          <li><span className="font-semibold text-foreground">1.</span> Our operations team reviews your request (usually within 30 minutes, 24/7).</li>
          <li><span className="font-semibold text-foreground">2.</span> You receive a confirmation email once the booking is cancelled.</li>
          {tier === "unpaid" ? (
            <li><span className="font-semibold text-foreground">3.</span> Nothing will be charged to your card — no payment was taken for this booking.</li>
          ) : (
            <li><span className="font-semibold text-foreground">3.</span> Any refund is returned to your original payment method, typically in 5–10 working days.</li>
          )}

        </ol>
        <div className="rounded-xl bg-[var(--surface-2)] p-4">
          <p className="font-semibold">Travelling soon? Call us to confirm immediately.</p>
          <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-[var(--navy-foreground)]">
            <Phone className="size-4" /> Call {SITE.phoneUK}
          </a>
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
