/**
 * /book/hourly — the front door to hourly hire.
 *
 * Hourly hire and day tours are one product: you book the car and driver by the
 * hour, each length of hire includes miles, and the stops you choose decide
 * whether you stay inside those miles or pay for extra ones. This page collects
 * the pickup, day and hours, then hands over to `/book/tour`, where premade
 * tours and suggested stops within the mileage are chosen, followed by vehicle,
 * details and payment.
 */
import { useState } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Users, Briefcase, MapPin, CalendarDays, ArrowRight, Loader2, Route as RouteIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { TrustpilotStrip } from "@/components/site/TrustpilotStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { getTourBookingOptions, type TourBookingOptions } from "@/lib/tour-booking.functions";
import { FaqSection, LongFormSections, faqJsonLd, type ContentFaq, type ContentSection } from "@/components/site/ContentSections";

/** City-level copy: this page answers "edinburgh hourly hire" and "glasgow hourly car". */
const HOURLY_SECTIONS: ContentSection[] = [
  {
    title: "Edinburgh hourly hire",
    paragraphs: [
      "Hourly car hire with a driver in Edinburgh suits days that don't fit a single A-to-B transfer: a morning of meetings around the New Town and Leith, a wedding, a shopping run, or a day out to the coast and back. Your car and driver stay with you for the hours you book, waiting between stops at no extra cost.",
      "Every Edinburgh hourly hire starts and finishes at the same address — your hotel, home, the airport or Waverley — and includes a mileage allowance for the length you choose. Popular days from Edinburgh reach Stirling, St Andrews, the Borders and the Highland edge inside the included miles.",
    ],
  },
  {
    title: "Glasgow hourly car with driver",
    paragraphs: [
      "Book an hourly car in Glasgow for city-centre meetings, match days, a night out across the West End, or a run down to Loch Lomond and back. Pricing is by the hour with miles included, so you know the cost before the day starts rather than watching a meter.",
      "Glasgow hourly hires include waiting time throughout, luggage space for your group and a driver who stays with the vehicle. Longer trips out to Ayrshire, Stirling or the Trossachs are priced with any extra miles shown up front.",
    ],
  },
  {
    title: "What an hourly hire includes",
    paragraphs: [
      "You pay for the hours you book. Included in the hourly rate are the driver, the vehicle, waiting time at every stop, fuel and the mileage allowance for that hire length. Finishing early still counts as the full hire; going past the included miles adds a per-mile charge that is quoted before you pay.",
      "Choose from saloon, executive, estate, people carrier and minibus classes, so groups from one to sixteen can travel together in the same booking.",
    ],
  },
  {
    title: "Hourly hire or a day tour?",
    paragraphs: [
      "They are the same product. Choose your hours and pickup, then either pick one of our ready-made Scottish tours or build your own day from suggested places within your mileage — castles, lochs, distilleries and viewpoints. The map shows your loop as you add stops.",
      "If your chosen stops need more driving than your hours allow, we say so and offer a longer hire instead of letting the day run short.",
    ],
  },
];

const HOURLY_FAQS: ContentFaq[] = [
  {
    q: "How much is hourly car hire in Edinburgh or Glasgow?",
    a: "Hourly hire is priced per hour by vehicle class, and each hire length includes a set mileage allowance. Choose your pickup, date and hours to see the exact price for your vehicle before you pay — there are no meters and no hidden waiting charges.",
  },
  {
    q: "What is the minimum hourly hire?",
    a: "Hires start at the shortest length shown on this page and run up to a full day online. Longer or multi-day hires are arranged by our team on request.",
  },
  {
    q: "Does the driver wait with us between stops?",
    a: "Yes. The vehicle and driver stay with you for the whole hire, including waiting time at every stop, so you can leave bags in the car and carry on when you're ready.",
  },
  {
    q: "How many miles are included?",
    a: "Every hire length includes miles, measured from your pickup, round each stop and back to the start. If your day goes further, the extra miles are charged at your vehicle's per-mile rate and shown in the price before payment.",
  },
  {
    q: "Can I book an hourly car for a wedding or match day?",
    a: "Yes. Weddings, sport, concerts, business days and airport-plus-sightseeing days are all common hourly bookings. Tell us the pickup, hours and passengers, and add any notes for the driver at checkout.",
  },
];

export const Route = createFileRoute("/book/hourly")({
  // Only emit `q` when it is actually present — defaulting to "" made the
  // router rewrite bare /book/hourly to /book/hourly?q= (a 307 on every crawl).
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q.length > 0 ? { q: search.q } : {},
  // When a link (e.g. the home page form) already carries the pickup, day, time
  // and hours, there is nothing left to ask here — go straight to the stops.
  beforeLoad: ({ search }) => {
    const p = new URLSearchParams(search.q || "");
    const pickupPlaceId = p.get("pickupPlaceId");
    const date = p.get("date");
    const time = p.get("time");
    const hours = Number(p.get("hours"));
    if (!pickupPlaceId || !date || !time || !hours) return;
    throw redirect({
      to: "/book/tour",
      search: {
        pickupPlaceId,
        pickupLabel: p.get("pickupLabel") || pickupPlaceId,
        date,
        time,
        hours: Math.min(24, Math.max(1, hours)),
        passengers: Math.max(1, Number(p.get("passengers")) || 2),
        luggage: Math.max(0, Number(p.get("luggage")) || 0),
      },
    });
  },
  head: () => ({
    meta: [
      { title: "Hourly Car Hire with Driver — Edinburgh & Glasgow | Cabslink" },
      { name: "description", content: "Hourly car hire with a driver in Edinburgh, Glasgow and across Scotland. Miles included, waiting time included, fixed price by the hour — book online in minutes." },
      { property: "og:title", content: "Hourly Car Hire with Driver — Edinburgh & Glasgow" },
      { property: "og:description", content: "Book a car and driver by the hour in Edinburgh or Glasgow: included miles, included waiting time and an itemised price before you pay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/book/hourly" }],
    scripts: [faqJsonLd(HOURLY_FAQS)],
  }),
  component: HourlyBookPage,
});

function parsePrefill(q: string | undefined) {
  const p = new URLSearchParams(q || "");
  const today = new Date().toISOString().slice(0, 10);
  const pickupPlaceId = p.get("pickupPlaceId") || "";
  return {
    pickup: pickupPlaceId
      ? ({ placeId: pickupPlaceId, label: p.get("pickupLabel") || pickupPlaceId } as SelectedPlace)
      : null,
    date: p.get("date") || today,
    time: p.get("time") || "09:00",
    hours: Math.min(24, Math.max(1, Number(p.get("hours")) || 0)),
    passengers: Math.max(1, Number(p.get("passengers")) || 2),
    luggage: Math.max(0, Number(p.get("luggage")) || 0),
  };
}

function HourlyBookPage() {
  const { q } = Route.useSearch();
  const [prefill] = useState(() => parsePrefill(q));
  const navigate = useNavigate();

  const options = useQuery<TourBookingOptions>({
    queryKey: ["tour-booking-options"],
    queryFn: () => getTourBookingOptions(),
    staleTime: 5 * 60_000,
  });
  const tiers = options.data?.tiers ?? [];
  const rules = options.data?.rules ?? null;

  const [pickup, setPickup] = useState<SelectedPlace | null>(prefill.pickup);
  const [date, setDate] = useState(prefill.date);
  const [time, setTime] = useState(prefill.time);
  const [hours, setHours] = useState<number | null>(prefill.hours || null);
  const [passengers, setPassengers] = useState(prefill.passengers);
  const [luggage, setLuggage] = useState(prefill.luggage);

  const today = new Date().toISOString().slice(0, 10);
  const chosenTier = tiers.find((t) => t.hours === hours) ?? null;
  const ready = !!pickup?.placeId && !!date && !!time && !!hours;

  function toStops() {
    if (!ready || !pickup) return;
    navigate({
      to: "/book/tour",
      search: {
        pickupPlaceId: pickup.placeId,
        pickupLabel: pickup.label,
        date,
        time,
        hours: hours!,
        passengers,
        luggage,
      },
    });
  }

  return (
    <SiteLayout>
      <section className="bg-[var(--navy)] text-white">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">Hourly hire</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mt-3">
            Hourly car hire with a driver in Edinburgh &amp; Glasgow
          </h1>
          <p className="mt-3 max-w-2xl text-white/70 text-sm md:text-base">
            Your vehicle and driver stay with you for the hours you book, and every length of hire
            includes miles. Tell us where to collect you and how long you'd like the car — then choose
            your stops from the places that fit those miles.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-5">
            <h2 className="font-display text-lg font-bold">Your hire</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs">
                  <MapPin className="mr-1 inline size-3" />
                  Pickup location (we finish back here)
                </Label>
                <PlaceAutocomplete value={pickup} onChange={setPickup} placeholder="Hotel, address or airport" />
              </div>
              <div>
                <Label className="text-xs">
                  <CalendarDays className="mr-1 inline size-3" />
                  Date
                </Label>
                <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Start time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                {rules && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hires start from {rules.earliest_start_time} and finish by {rules.latest_finish_time}.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">
                  <Users className="mr-1 inline size-3" />
                  Passengers
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={80}
                  value={passengers}
                  onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <Label className="text-xs">
                  <Briefcase className="mr-1 inline size-3" />
                  Suitcases
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={80}
                  value={luggage}
                  onChange={(e) => setLuggage(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">
                <Clock className="mr-1 inline size-3.5" />
                How long would you like the car?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each length includes miles. The hours are a firm limit — going further than the
                included miles is fine and the extra miles are priced before you pay.
              </p>
              {options.isLoading ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Loading hire lengths…
                </p>
              ) : tiers.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  We couldn't load hire lengths. <Link to="/contact-us" className="underline">Contact us</Link> and
                  we'll book it for you.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {tiers.map((t) => (
                    <button
                      key={t.hours}
                      type="button"
                      onClick={() => setHours(t.hours)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        hours === t.hours
                          ? "border-[var(--gold)] ring-1 ring-[var(--gold)]"
                          : "border-border hover:border-[var(--gold)]"
                      }`}
                    >
                      <p className="font-display text-xl font-bold">{t.hours} hours</p>
                      <p className="text-xs text-muted-foreground">{t.included_miles} miles included</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Next: pick a ready-made tour or your own stops from the places within your miles.
              </p>
              <Button variant="gold" disabled={!ready} onClick={toStops}>
                Choose stops <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold">Longer than one day?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We book up to {rules?.max_bookable_hours ?? 12} hours online. For hires running over more
                than one day, contact us and we'll confirm the full cost with you.
              </p>
              <Link to="/contact-us" className="mt-2 inline-block text-xs font-semibold underline">
                Contact us about a multi-day hire
              </Link>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-28">
            <aside className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
                How hourly hire is priced
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                  You pay for the hours you book. Finishing early still counts as the full hire.
                </li>
                <li className="flex gap-2">
                  <RouteIcon className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                  {chosenTier
                    ? `${chosenTier.hours} hours includes ${chosenTier.included_miles} miles, measured from your pickup, round every stop and back.`
                    : "Every hire length includes miles, measured from your pickup, round every stop and back."}
                </li>
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                  Stops further out are still yours to choose — the extra miles are added to your price
                  and shown before you pay.
                </li>
                <li className="flex gap-2">
                  <Users className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                  If your stops need more driving than the hours allow, we'll suggest adding hours so you
                  get proper time at each place.
                </li>
              </ul>
            </aside>
            <TrustpilotStrip />
          </div>
        </div>
      </section>

      <LongFormSections sections={HOURLY_SECTIONS} heading="Hourly hire across Scotland" />
      <FaqSection faqs={HOURLY_FAQS} heading="Hourly car hire questions" />
    </SiteLayout>
  );
}
