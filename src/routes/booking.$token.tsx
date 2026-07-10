import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, Car, Clock, MapPin, Phone, Mail, ShieldCheck, User, Users, Briefcase, Info } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getBookingByToken } from "@/lib/booking.functions";
import { paymentNextStepMessage, statusLabel, type BookingStatus, type PaymentMode } from "@/lib/booking-lifecycle";
import { SITE } from "@/lib/site";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/booking/$token")({
  head: () => ({
    meta: [
      { title: `Booking confirmation — ${SITE.name}` },
      { name: "description", content: "View your booking details." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmationPage,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="section-y">
        <div className="container-x max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold">Confirmation link unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            This link is invalid or has expired. Please contact us and quote your booking reference.
          </p>
          <div className="mt-6"><Button asChild><Link to="/">Back to home</Link></Button></div>
        </div>
      </section>
    </SiteLayout>
  ),
});

function ConfirmationPage() {
  const { token } = Route.useParams();
  const fetchFn = useServerFn(getBookingByToken);
  const q = useQuery({
    queryKey: ["booking-confirmation", token],
    queryFn: () => fetchFn({ data: { token } }),
    retry: false,
    staleTime: 60_000,
  });

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
    return (
      <SiteLayout>
        <section className="section-y">
          <div className="container-x max-w-2xl text-center">
            <h1 className="font-display text-3xl font-bold">Confirmation link unavailable</h1>
            <p className="mt-3 text-muted-foreground">
              {(q.error as Error | null)?.message ?? "This link is invalid or has expired."}
            </p>
            <div className="mt-6"><Button asChild><Link to="/">Back to home</Link></Button></div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const b = q.data;
  const paymentMode: PaymentMode = "manual"; // Phase 2A: online payments not wired
  const nextStep = paymentNextStepMessage(paymentMode, b.status as BookingStatus);
  const heading = b.status === "confirmed" ? "Booking confirmed" : "Booking request received";

  return (
    <SiteLayout>
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x max-w-3xl">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-10 shadow-[var(--shadow-elegant)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">Cabslink · Your Journey</p>
                <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">{heading}</h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-lg">{nextStep}</p>
              </div>
              <div className="rounded-2xl border border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-5 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Reference</p>
                <p className="font-mono text-lg font-bold tracking-wider">{b.bookingRef}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">{statusLabel(b.status)}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Row icon={<MapPin className="size-4" />} label="Pickup" value={b.pickupAddress} />
              <Row icon={<MapPin className="size-4" />} label="Destination" value={b.dropoffAddress} />
              <Row icon={<CalendarDays className="size-4" />} label="Date" value={b.pickupDate} />
              <Row icon={<Clock className="size-4" />} label="Time" value={b.pickupTime} />
              <Row icon={<Car className="size-4" />} label="Vehicle" value={b.vehicleType} />
              <Row icon={<Users className="size-4" />} label="Passengers" value={String(b.passengers)} />
              <Row icon={<Briefcase className="size-4" />} label="Luggage" value={String(b.luggage)} />
              {b.distanceMiles != null && <Row icon={<MapPin className="size-4" />} label="Estimated distance" value={`${b.distanceMiles.toFixed(1)} mi`} />}
              {b.flightNumber && <Row icon={<Info className="size-4" />} label="Flight" value={b.flightNumber} />}
            </div>

            {(b.meetGreet || b.childSeat || b.returnJourney) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {b.meetGreet && <Chip>Meet &amp; greet</Chip>}
                {b.childSeat && <Chip>Child seat</Chip>}
                {b.returnJourney && <Chip>Return journey</Chip>}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-border bg-[var(--surface)] p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Estimated fare</p>
                <p className="font-display text-2xl font-bold">
                  {b.price != null ? `£${b.price.toFixed(2)}` : "—"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Payment status: {statusLabel(b.paymentStatus as any)}</p>
              </div>
              <BadgeCheck className="size-8 text-[var(--gold)]" />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 text-sm">
              <ContactRow icon={<User className="size-4" />} label="Booked by" value={b.customerName} />
              <ContactRow icon={<Mail className="size-4" />} label="Email" value={b.customerEmail} />
              <ContactRow icon={<Phone className="size-4" />} label="Phone" value={b.customerPhone} />
            </div>

            <div className="mt-8 rounded-2xl border border-[var(--gold)]/30 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] p-5 text-sm">
              <p className="font-semibold flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--gold)]" /> What happens next</p>
              <p className="mt-1 text-muted-foreground leading-relaxed">{nextStep}</p>
              <p className="mt-3 text-muted-foreground">
                Need to reach us? Call <a className="font-semibold text-foreground" href={`tel:${SITE.phoneUK}`}>{SITE.phoneUK}</a> or email <a className="font-semibold text-foreground" href={`mailto:${SITE.email}`}>{SITE.email}</a> and quote your reference <span className="font-mono">{b.bookingRef}</span>.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
              <Button asChild className="ml-auto"><a href={`tel:${SITE.phoneUK}`}>Call us</a></Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        <span className="text-[var(--gold)]">{icon}</span>{label}
      </p>
      <p className="mt-1 font-semibold text-foreground text-sm break-words">{value}</p>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[var(--gold)]">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground text-sm">{value}</p>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-3 py-1 text-[11px] font-semibold text-[var(--navy)]">
      <BadgeCheck className="size-3 text-[var(--gold)]" /> {children}
    </span>
  );
}
