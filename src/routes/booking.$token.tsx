import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, Car, Clock, MapPin, Phone, Mail, ShieldCheck, User, Users, Briefcase, Info, Copy, Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getBookingByToken } from "@/lib/booking.functions";
import { track } from "@/lib/tracking";
import { paymentNextStepMessage, statusLabel, type BookingStatus, type PaymentMode } from "@/lib/booking-lifecycle";
import { SITE } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { confirmBookingPayment } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { BookingCardPayment } from "@/components/site/BookingCardPayment";

export const Route = createFileRoute("/booking/$token")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search.session_id === "string" && search.session_id.length > 0
      ? { session_id: search.session_id }
      : {},
  head: () => ({
    meta: [
      { title: `Booking confirmation — ${SITE.name}` },
      { name: "description", content: "View your booking details." },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ConfirmationPage,
  notFoundComponent: () => <ExpiredPage />,
});


function ExpiredPage() {
  return (
    <SiteLayout>
      <section className="section-y">
        <div className="container-x max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold">Confirmation link unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            This booking confirmation link is invalid or has expired. Please contact {SITE.name} and provide your booking reference.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
            <Button asChild><a href={`tel:${SITE.phoneUK}`}>Call {SITE.phoneUK}</a></Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ConfirmationPage() {
  const { token } = Route.useParams();
  const { session_id: sessionId } = Route.useSearch();
  const fetchFn = useServerFn(getBookingByToken);
  const confirmFn = useServerFn(confirmBookingPayment);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["booking-confirmation", token],
    queryFn: () => fetchFn({ data: { token } }),
    retry: false,
    staleTime: 60_000,
  });
  const [downloading, setDownloading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [verifying, setVerifying] = useState(!!sessionId);

  // A Stripe redirect is not proof of payment: verify the session server-side
  // before the booking is treated as confirmed.
  const verified = useRef(false);
  useEffect(() => {
    if (verified.current || !sessionId || !q.data) return;
    verified.current = true;
    (async () => {
      try {
        const res = await confirmFn({
          data: { sessionId, bookingRef: q.data.bookingRef, environment: getStripeEnvironment() },
        });
        if ("error" in res) toast.error(res.error);
        else if (res.paid) toast.success("Payment received — your booking is confirmed.");
        else toast.error("We haven't received your payment yet. Please try again.");
        await queryClient.invalidateQueries({ queryKey: ["booking-confirmation", token] });
      } catch {
        toast.error("We could not verify your payment. Please contact us with your reference.");
      } finally {
        setVerifying(false);
      }
    })();
  }, [sessionId, q.data, confirmFn, queryClient, token]);

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !q.data) return;
    fired.current = true;
    track("booking_confirmed", {
      booking_ref: q.data.bookingRef,
      status: q.data.status,
    });
  }, [q.data]);

  if (q.isLoading) {
    return (
      <SiteLayout>
        <section className="section-y">
          <div className="container-x max-w-2xl text-center text-muted-foreground">Loading your booking…</div>
        </section>
      </SiteLayout>
    );
  }

  if (q.isError || !q.data) {
    if (typeof window !== "undefined") notFound({ throw: false });
    return <ExpiredPage />;
  }

  const b = q.data;
  const isPaid = b.paymentStatus === "paid";
  const paymentMode: PaymentMode = isPaid ? "online" : "manual";
  const amountPence = b.price != null ? Math.round(b.price * 100) : 0;
  const needsPayment = !isPaid && amountPence >= 100;
  const nextStep = needsPayment
    ? "Your booking is not confirmed yet — complete your card payment below to secure it."
    : paymentNextStepMessage(paymentMode, b.status as BookingStatus);
  const heading = verifying
    ? "Checking your payment…"
    : isPaid
      ? "Booking confirmed — payment received"
      : "Payment required to confirm";
  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/booking/${token}?session_id={CHECKOUT_SESSION_ID}`
      : `https://cabslink.com/booking/${token}?session_id={CHECKOUT_SESSION_ID}`;


  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(b.bookingRef);
      toast.success("Reference copied");
    } catch {
      toast.error("Could not copy — please write it down");
    }
  };
  const extras = [
    b.meetGreet ? "Meet & greet" : null,
    b.childSeat ? "Child seat" : null,
    b.returnJourney ? "Return journey" : null,
  ].filter(Boolean) as string[];

  const downloadSlip = async () => {
    setDownloading(true);
    try {
      const { downloadBookingSlip } = await import("@/lib/booking-slip");
      await downloadBookingSlip({
        bookingRef: b.bookingRef,
        status: b.status,
        statusLabel: statusLabel(b.status),
        pickupAddress: b.pickupAddress,
        dropoffAddress: b.dropoffAddress,
        pickupDate: b.pickupDate,
        pickupTime: b.pickupTime,
        vehicleType: b.vehicleType,
        passengers: b.passengers,
        luggage: b.luggage,
        distanceMiles: b.distanceMiles,
        flightNumber: b.flightNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerEmail: b.customerEmail,
        price: b.price,
        paymentStatus: b.paymentStatus,
        extras,
        nextStep: nextStep,
      });
      toast.success("Booking slip downloaded");
    } catch {
      toast.error("Could not create the file — please try again");
    } finally {
      setDownloading(false);
    }
  };


  return (
    <SiteLayout>
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x max-w-4xl">
          {/* ===== TICKET ===== */}
          <div id="ticket" className="overflow-hidden rounded-2xl border border-[var(--navy)]/12 bg-card shadow-raised">
            {/* Header bar */}
            <div className="bg-[var(--navy)] px-5 py-4 md:px-7 md:py-5 text-[var(--navy-foreground)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">{SITE.name} · E-Ticket</p>
                  <h1 className="mt-1 font-display text-xl md:text-2xl font-bold leading-tight">{heading}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--gold)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
                    {statusLabel(b.status)}
                  </span>
                  <BadgeCheck className="size-6 text-[var(--gold)]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row">
              {/* Main details */}
              <div className="flex-1 p-5 md:p-7">
                {/* Route line */}
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

                {/* Dense fact grid */}
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-[var(--navy)]/15 pt-4 sm:grid-cols-3">
                  <Fact icon={<CalendarDays className="size-3" />} label="Date" value={b.pickupDate} />
                  <Fact icon={<Clock className="size-3" />} label="Time" value={b.pickupTime} />
                  <Fact icon={<Car className="size-3" />} label="Vehicle" value={b.vehicleType} />
                  <Fact icon={<Users className="size-3" />} label="Passengers" value={String(b.passengers)} />
                  <Fact icon={<Briefcase className="size-3" />} label="Luggage" value={String(b.luggage)} />
                  {b.distanceMiles != null && <Fact icon={<MapPin className="size-3" />} label="Distance" value={`${b.distanceMiles.toFixed(1)} mi`} />}
                  {b.flightNumber && <Fact icon={<Info className="size-3" />} label="Flight" value={b.flightNumber} />}
                  <Fact icon={<User className="size-3" />} label="Booked by" value={b.customerName} />
                  <Fact icon={<Phone className="size-3" />} label="Phone" value={b.customerPhone} />
                  <Fact icon={<Mail className="size-3" />} label="Email" value={b.customerEmail} />
                  {extras.length > 0 && <Fact icon={<BadgeCheck className="size-3" />} label="Extras" value={extras.join(" · ")} />}
                </dl>
              </div>

              {/* Stub */}
              <div className="ticket-perforation hidden w-px md:block" aria-hidden />
              <div className="border-t border-dashed border-[var(--navy)]/25 md:border-t-0 md:w-[236px] shrink-0 p-5 md:p-6 bg-[var(--surface-2)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Booking reference</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider">{b.bookingRef}</p>

                <div className="mt-4 border-t border-dashed border-[var(--navy)]/20 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Estimated fare</p>
                  <p className="font-display text-2xl font-bold">{b.price != null ? `£${b.price.toFixed(2)}` : "—"}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    {isPaid ? "Paid in full" : "Unpaid — payment required"}
                  </p>
                </div>

                {/* Barcode flourish */}
                <div aria-hidden className="mt-4 h-9 w-full bg-[repeating-linear-gradient(90deg,var(--navy)_0_2px,transparent_2px_5px)] opacity-80" />

                <div className="mt-4 flex gap-2 print:hidden">
                  <Button size="sm" variant="outline" onClick={copyRef} className="h-8 flex-1 gap-1 text-xs"><Copy className="size-3" /> Copy</Button>
                  <Button size="sm" variant="outline" onClick={downloadSlip} disabled={downloading} className="h-8 flex-1 gap-1 text-xs">
                    {downloading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />} Download
                  </Button>
                </div>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground print:hidden">
                  Saves a PDF booking slip to your device.
                </p>
              </div>
            </div>

            {/* Footer strip inside ticket */}
            <div className="border-t border-[var(--navy)]/10 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-5 py-3 md:px-7 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Next: </span>{nextStep} Quote ref <span className="font-mono">{b.bookingRef}</span> · {SITE.phoneUK} · {SITE.email}
            </div>
          </div>
          {/* ===== /TICKET ===== */}

          {needsPayment && (
            <div className="mt-6 rounded-2xl border border-[var(--gold)]/45 bg-card p-5 md:p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Payment pending</p>
                  <h2 className="mt-1 font-display text-xl md:text-2xl font-bold">Continue to payment</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Booking <span className="font-semibold text-foreground">{b.bookingRef}</span> is held but not
                    confirmed. Pay by card to confirm it — we'll email your confirmation as soon as payment clears.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Amount due</p>
                  <p className="font-display text-3xl font-bold tabular-nums text-[var(--gold-ink)]">
                    £{(amountPence / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {payOpen ? (
                <div className="mt-5">
                  <BookingCardPayment
                    amountPence={amountPence}
                    bookingRef={b.bookingRef}
                    email={b.customerEmail || undefined}
                    returnUrl={returnUrl}
                  />
                </div>
              ) : (
                <Button className="mt-5 gap-2" size="lg" onClick={() => setPayOpen(true)}>
                  Continue to payment
                </Button>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
            <Button asChild variant="outline" rel="noreferrer"><Link to="/">Back to home</Link></Button>
            <Button asChild variant="navy" className="ml-auto"><a href={`tel:${SITE.phoneUK}`}><Phone className="size-4" /> Call us</a></Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
            <ShieldCheck className="size-3.5 text-[var(--gold-ink)]" /> Keep this reference safe — you'll need it when contacting us.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
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

void useState;

