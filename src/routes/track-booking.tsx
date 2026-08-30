import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getBookingByReference } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { statusLabel, type BookingStatus } from "@/lib/booking-lifecycle";
import { SITE } from "@/lib/site";
import { Search, ArrowLeft, CalendarDays, Car, Clock, MapPin, Phone, Mail, User, Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/track-booking")({
  head: () => ({
    meta: [
      { title: `Track your booking — ${SITE.name}` },
      { name: "description", content: "Find your Cabslink booking status using your booking reference." },
      { property: "og:title", content: `Track your booking — ${SITE.name}` },
      { property: "og:description", content: "Find your Cabslink booking status using your booking reference." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackBookingPage,
});

function TrackBookingPage() {
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getBookingByReference>> | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const fetchFn = useServerFn(getBookingByReference);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await fetchFn({ data: { bookingRef: ref.trim().toUpperCase() } });
      if (!data) {
        setError("We couldn't find a booking with that reference. Please check it and try again.");
      } else {
        setResult(data);
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SiteLayout>
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x max-w-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[var(--gold)]"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-card shadow-raised">
            <div className="bg-[var(--navy)] px-6 py-5 text-[var(--navy-foreground)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">{SITE.name}</p>
              <h1 className="mt-1 font-display text-xl font-bold md:text-2xl">Track your booking</h1>
              <p className="mt-1 text-sm text-white/70">Enter your booking reference to see your live journey status.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="bookingRef">Booking reference</Label>
                <Input
                  id="bookingRef"
                  value={ref}
                  onChange={(e) => setRef(e.target.value.toUpperCase())}
                  placeholder="e.g. CL-260830-A3B9"
                  autoComplete="off"
                  required
                  className="font-mono uppercase"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !ref.trim()}
                className="w-full gap-2 bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)]/90"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-[var(--navy)]/30 border-t-[var(--navy)]" /> Searching…</span>
                ) : (
                  <><Search className="size-4" /> Track booking</>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                You can find your booking reference in your confirmation email or SMS.
              </p>
            </form>
          </div>

          {result && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-card shadow-raised">
              <div className="flex items-center justify-between gap-3 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-6 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Booking reference</p>
                  <p className="font-mono text-lg font-bold tracking-wider">{result.bookingRef}</p>
                </div>
                <StatusBadge status={result.status as BookingStatus} />
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span className="size-2.5 rounded-full bg-[var(--gold)]" />
                    <span className="my-1 w-px flex-1 bg-[var(--navy)]/20" />
                    <MapPin className="size-3.5 text-[var(--navy)]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
                      <p className="text-sm font-semibold break-words">{result.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Destination</p>
                      <p className="text-sm font-semibold break-words">{result.dropoffAddress}</p>
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Fact icon={<CalendarDays className="size-3" />} label="Date" value={result.pickupDate} />
                  <Fact icon={<Clock className="size-3" />} label="Time" value={result.pickupTime} />
                  <Fact icon={<Car className="size-3" />} label="Vehicle" value={result.vehicleType} />
                  <Fact icon={<User className="size-3" />} label="Passengers" value={String(result.passengers)} />
                  <Fact icon={<RouteIcon className="size-3" />} label="Distance" value={result.distanceMiles != null ? `${result.distanceMiles.toFixed(1)} mi` : "—"} />
                  <Fact icon={<Phone className="size-3" />} label="Phone" value={result.customerPhone} />
                  <Fact icon={<Mail className="size-3" />} label="Email" value={result.customerEmail} />
                </dl>

                {result.notes && (
                  <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                    <span className="font-semibold">Notes: </span>{result.notes}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
                  <Button asChild variant="navy" className="ml-auto"><a href={`tel:${SITE.phoneUK}`}><Phone className="size-4" /> Call us</a></Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const label = statusLabel(status);
  const color = status === "confirmed" || status === "completed"
    ? "bg-emerald-100 text-emerald-800"
    : status === "cancelled" || status === "rejected"
    ? "bg-red-100 text-red-800"
    : status === "driver_en_route" || status === "passenger_on_board"
    ? "bg-[var(--gold)]/20 text-[var(--navy)]"
    : "bg-blue-100 text-blue-800";
  return (
    <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>
      {label}
    </span>
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
