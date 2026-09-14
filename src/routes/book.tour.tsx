/**
 * /book/tour — the day-tour booking wizard.
 *
 * Seven steps: tour choice, pickup & date, hours, vehicle, stops, price,
 * details & payment. Prices always come from the server (`quoteTour`); the
 * booking is saved unpaid and then paid with the same card checkout used for
 * transfers.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Loader2, MapPin, Users,
  Briefcase, AlertTriangle, Plus, Trash2, ShieldCheck,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/site/PhoneInput";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { useCaptcha } from "@/components/site/Captcha";
import { BookingCardPayment } from "@/components/site/BookingCardPayment";
import { toast } from "sonner";
import { minutesLabel } from "@/lib/tour-quote";
import {
  getTourBookingOptions,
  getTourStopSuggestions,
  quoteTour,
  createTourBooking,
  type TourBookingOptions,
} from "@/lib/tour-booking.functions";
import type { TourQuoteResult } from "@/lib/tour-quote.server";

/**
 * `tour` deep-links a premade tour. The rest is the hand-off from the hourly
 * hire form: the customer has already told us where, when and for how long, so
 * they land here on the stops-and-tours step with everything filled in.
 */
const searchSchema = z.object({
  tour: z.string().trim().max(120).optional(),
  pickupPlaceId: z.string().trim().max(300).optional(),
  pickupLabel: z.string().trim().max(300).optional(),
  date: z.string().trim().max(20).optional(),
  time: z.string().trim().max(10).optional(),
  hours: z.coerce.number().int().min(1).max(24).optional(),
  passengers: z.coerce.number().int().min(1).max(80).optional(),
  luggage: z.coerce.number().int().min(0).max(80).optional(),
});

export const Route = createFileRoute("/book/tour")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Book a Private Day Tour in Scotland | CabsLink" },
      {
        name: "description",
        content:
          "Build your Scottish day tour by the hour: choose a tour or your own stops, pick your hours and vehicle, see an itemised price and pay online.",
      },
      { property: "og:title", content: "Book a Private Day Tour in Scotland | CabsLink" },
      {
        property: "og:description",
        content: "Hourly private day tours with included mileage, itemised pricing and secure online payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TourWizard,
});

type Stop = { poiId: string | null; placeId: string; name: string; dwellMinutes: number | null };

const STEPS = ["Tour", "Pickup", "Hours", "Vehicle", "Stops", "Price", "Pay"];

function TourWizard() {
  const search = Route.useSearch();
  const { tour: tourParam } = search;
  const [prefilled, setPrefilled] = useState(false);
  const options = useQuery<TourBookingOptions>({
    queryKey: ["tour-booking-options"],
    queryFn: () => getTourBookingOptions(),
    staleTime: 5 * 60_000,
  });

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"premade" | "custom">("premade");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [start, setStart] = useState<SelectedPlace | null>(null);
  const [end, setEnd] = useState<SelectedPlace | null>(null);
  const [sameEnd, setSameEnd] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState<number | null>(null);
  const [vehicleClassId, setVehicleClassId] = useState<string | null>(null);
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(2);
  const [stops, setStops] = useState<Stop[]>([]);
  const [newStop, setNewStop] = useState<SelectedPlace | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flight, setFlight] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<TourQuoteResult | null>(null);
  const [created, setCreated] = useState<{ bookingRef: string; total: number } | null>(null);

  const captcha = useCaptcha("tour-booking");
  const data = options.data;
  const tours = data?.tours ?? [];
  const classes = data?.classes ?? [];
  const tiers = data?.tiers ?? [];
  const template = tours.find((t) => t.id === templateId) ?? null;

  // Deep link from a tour page.
  useEffect(() => {
    if (!tourParam || !tours.length || templateId) return;
    const match = tours.find((t) => t.slug === tourParam);
    if (match) {
      setMode("premade");
      selectTemplate(match.id);
      setStep(1);
    }
  }, [tourParam, tours.length]);

  // Hand-off from the hourly hire form: pickup, day, hours and party are known,
  // so fill them in and open on the tours-and-stops choice.
  useEffect(() => {
    if (prefilled || !data) return;
    if (!search.pickupPlaceId) return;
    setStart({ placeId: search.pickupPlaceId, label: search.pickupLabel || search.pickupPlaceId } as SelectedPlace);
    if (search.date) setDate(search.date);
    if (search.time) setTime(search.time);
    if (search.passengers) setPassengers(search.passengers);
    if (search.luggage != null) setLuggage(search.luggage);
    const wanted = search.hours;
    if (wanted && tiers.length) {
      // Hours are sold in tiers, each with its own included mileage.
      const snapped = tiers.reduce(
        (best, t) => (Math.abs(t.hours - wanted) < Math.abs(best - wanted) ? t.hours : best),
        tiers[0]!.hours,
      );
      setHours(snapped);
    }
    setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, prefilled]);



  function selectTemplate(id: string) {
    const t = tours.find((x) => x.id === id);
    setTemplateId(id);
    setQuote(null);
    if (!t) return;
    setHours(t.default_duration_hours ?? tiers[0]?.hours ?? 8);
    setStops(
      t.stops
        .filter((s) => s.default_selected || s.mandatory)
        .sort((a, b) => a.stop_order - b.stop_order)
        .map((s) => ({
          poiId: s.poi_id,
          placeId: s.place_id,
          name: s.name,
          dwellMinutes: s.recommended_visit_minutes,
        })),
    );
  }

  function chooseCustom() {
    setMode("custom");
    setTemplateId(null);
    setStops([]);
    setQuote(null);
    setHours(tiers[0]?.hours ?? 8);
  }

  const includedMiles = hours ? (tiers.find((t) => t.hours === hours)?.included_miles ?? 0) : 0;
  /** A tour has to start and finish inside the same day's bookable window. */
  const fitsDay = (() => {
    if (!hours || !data || !time) return true;
    const mins = (v: string) => {
      const [h, m] = v.split(":").map((x) => Number(x));
      return (h ?? 0) * 60 + (m ?? 0);
    };
    return mins(time) + hours * 60 <= mins(data.rules.latest_finish_time);
  })();
  const liveQuote = quote?.quote ?? null;

  const vehicle = classes.find((c) => c.id === vehicleClassId) ?? null;
  const fixedPriceForVehicle =
    template && vehicleClassId
      ? template.prices.find((p) => p.vehicle_class_id === vehicleClassId)?.price ?? null
      : null;

  const quoteReq = () => ({
    mode,
    templateId,
    startPlaceId: start?.placeId ?? "",
    startLabel: start?.label ?? "",
    endPlaceId: sameEnd ? null : end?.placeId ?? null,
    endLabel: sameEnd ? null : end?.label ?? null,
    hours: hours ?? 0,
    vehicleClassId: vehicleClassId ?? "",
    passengers,
    luggage,
    stops: stops.map((s) => ({
      poiId: s.poiId,
      placeId: s.placeId,
      name: s.name,
      dwellMinutes: s.dwellMinutes,
    })),
  });

  const priceMutation = useMutation({
    mutationFn: async () => quoteTour({ data: quoteReq() }),
    onSuccess: (res) => setQuote(res),
    onError: (e: Error) => toast.error(e.message || "We couldn't price that tour."),
  });

  const bookMutation = useMutation({
    mutationFn: async () =>
      createTourBooking({
        data: {
          ...quoteReq(),
          date,
          time,
          name,
          email,
          phone,
          flight: flight || null,
          notes: notes || null,
          website: "",
          captchaToken: captcha.token,
        },
      }),
    onSuccess: (res) => {
      if (!res.bookingRef) return;
      setCreated({ bookingRef: res.bookingRef, total: res.total });
      setStep(6);
    },
    onError: (e: Error) => {
      captcha.reset();
      toast.error(e.message || "We couldn't save your tour. Please try again.");
    },
  });

  // Ask the server for a price whenever the customer reaches the price step.
  useEffect(() => {
    if (step === 5 && start && hours && vehicleClassId && !priceMutation.isPending) {
      priceMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // On the stops step, keep the miles and time meter honest as stops change.
  useEffect(() => {
    if (step !== 4 || !start || !hours || !vehicleClassId) return;
    const t = setTimeout(() => priceMutation.mutate(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stops, hours, vehicleClassId, sameEnd, end?.placeId]);

  // Curated stops that fit the mileage the chosen hours include.
  const suggestions = useQuery({
    queryKey: ["tour-stop-suggestions", start?.placeId ?? "", hours ?? 0],
    enabled: step === 4 && !!start?.placeId && !!hours,
    staleTime: 5 * 60_000,
    queryFn: () =>
      getTourStopSuggestions({ data: { startPlaceId: start!.placeId, hours: hours!, limit: 24 } }),
  });


  const today = new Date().toISOString().slice(0, 10);
  const canNext = (() => {
    switch (step) {
      case 0: return mode === "custom" || !!templateId;
      case 1: return !!start && !!date && !!time && (sameEnd || !!end);
      case 2: return !!hours && fitsDay;
      case 3: return !!vehicleClassId && passengers > 0;
      case 4: return mode === "premade" || stops.length > 0;
      case 5: return !!quote && !quote.quote.blockedReason;
      default: return false;
    }
  })();

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 pt-28 pb-16 md:pt-32">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">
          Private day tours
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">Build your day tour</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          You book the car and driver by the hour, with miles included. Add stops and we'll show you
          exactly what fits in the day and what it costs before you pay.
        </p>

        {/* Step rail */}
        <ol className="mt-8 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  i === step
                    ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_16%,transparent)]"
                    : i < step
                      ? "border-border text-muted-foreground hover:border-[var(--gold)]"
                      : "border-border text-muted-foreground/50"
                }`}
              >
                {i < step ? <Check className="mr-1 inline size-3" /> : `${i + 1}. `}
                {label}
              </button>
            </li>
          ))}
        </ol>

        {options.isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading tours…
          </div>
        ) : options.isError ? (
          <p className="mt-10 text-sm font-semibold text-destructive">
            We couldn't load the tour options. Please refresh, or call us and we'll book it for you.
          </p>
        ) : (
          <div className="mt-8 rounded-3xl border border-border bg-[var(--surface)] p-5 md:p-7">
            {/* 1. Tour or custom */}
            {step === 0 && (
              <div className="space-y-5">
                <StepTitle title="Choose a tour, or build your own day" />
                <div className="grid gap-4 md:grid-cols-2">
                  {tours.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setMode("premade"); selectTemplate(t.id); }}
                      className={`text-left rounded-2xl border p-4 transition ${
                        mode === "premade" && templateId === t.id
                          ? "border-[var(--gold)] ring-1 ring-[var(--gold)]"
                          : "border-border hover:border-[var(--gold)]"
                      }`}
                    >
                      {t.hero_image_url && (
                        <img
                          src={t.hero_image_url}
                          alt={t.name}
                          loading="lazy"
                          className="mb-3 h-32 w-full rounded-xl object-cover"
                        />
                      )}
                      <p className="font-semibold">{t.name}</p>
                      {t.short_description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.short_description}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t.default_duration_hours ?? "—"} hours · {t.stops.length} stops
                        {t.included_miles ? ` · ${t.included_miles} miles included` : ""}
                      </p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={chooseCustom}
                    className={`text-left rounded-2xl border border-dashed p-4 transition ${
                      mode === "custom" ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"
                    }`}
                  >
                    <p className="font-semibold">Build my own day</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Start where you like, choose your own stops and we'll work out the miles and time.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Pickup, drop-off, date & time */}
            {step === 1 && (
              <div className="space-y-5">
                <StepTitle title="Where do we collect you, and when?" />
                {template?.start_mode === "fixed" && template.fixed_start_address && (
                  <p className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-2 text-xs font-medium">
                    This tour starts at {template.fixed_start_address}. Tell us your address and we'll
                    confirm the meeting point.
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tw-start">Pickup address</Label>
                    <PlaceAutocomplete id="tw-start" value={start} onChange={setStart} placeholder="Hotel, home or airport" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tw-end">Drop-off</Label>
                    {sameEnd ? (
                      <div className="flex h-10 items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
                        Back to the pickup address
                      </div>
                    ) : (
                      <PlaceAutocomplete id="tw-end" value={end} onChange={setEnd} placeholder="Different drop-off" />
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold underline"
                      onClick={() => { setSameEnd(!sameEnd); setQuote(null); }}
                    >
                      {sameEnd ? "Finish somewhere else" : "Finish where we started"}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tw-date">Tour date</Label>
                    <Input id="tw-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tw-time">Start time</Label>
                    <Input id="tw-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    {data && (
                      <p className="text-xs text-muted-foreground">
                        Tours start from {data.rules.earliest_start_time} and finish by {data.rules.latest_finish_time}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Hours */}
            {step === 2 && (
              <div className="space-y-5">
                <StepTitle title="How long would you like the car for?" />
                <p className="text-sm text-muted-foreground">
                  Each length includes miles. Go further and the extra miles are charged; the hours
                  themselves are a firm limit.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {tiers.map((t) => (
                    <button
                      key={t.hours}
                      type="button"
                      onClick={() => { setHours(t.hours); setQuote(null); }}
                      className={`rounded-2xl border p-4 text-left ${
                        hours === t.hours ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"
                      }`}
                    >
                      <p className="font-display text-xl font-bold">{t.hours} hours</p>
                      <p className="text-xs text-muted-foreground">{t.included_miles} miles included</p>
                    </button>
                  ))}
                </div>
                {hours && time && data && (
                  <p className={`text-xs ${fitsDay ? "text-muted-foreground" : "font-semibold text-destructive"}`}>
                    {fitsDay
                      ? `Starting at ${time}, a ${hours}-hour tour finishes about ${addHoursToTime(time, hours)}. Tours must finish by ${data.rules.latest_finish_time}.`
                      : `A ${hours}-hour tour starting at ${time} would finish after ${data.rules.latest_finish_time}. Go back and choose an earlier start, or pick fewer hours.`}
                  </p>
                )}
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">Want more than one day?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We book up to {data?.rules.max_bookable_hours ?? 12} hours online. For a tour running
                    over more than one day, contact us and we'll confirm the full cost with you.
                  </p>
                  <Link
                    to="/contact-us"
                    className="mt-2 inline-block text-xs font-semibold underline"
                  >
                    Contact us about a multi-day tour
                  </Link>
                </div>
              </div>
            )}

            {/* 4. Vehicle & group */}
            {step === 3 && (
              <div className="space-y-5">
                <StepTitle title="Which vehicle, and how many of you?" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    icon={<Users className="size-4" />}
                    label="Passengers"
                    value={passengers}
                    min={1}
                    max={80}
                    onChange={(v) => { setPassengers(v); setQuote(null); }}
                  />
                  <NumberField
                    icon={<Briefcase className="size-4" />}
                    label="Suitcases"
                    value={luggage}
                    min={0}
                    max={80}
                    onChange={(v) => { setLuggage(v); setQuote(null); }}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {classes
                    .filter((c) => (c.max_passengers ?? 99) >= passengers)
                    .map((c) => {
                      const fixed = template?.prices.find((p) => p.vehicle_class_id === c.id)?.price ?? null;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setVehicleClassId(c.id); setQuote(null); }}
                          className={`flex items-center gap-4 rounded-2xl border p-4 text-left ${
                            vehicleClassId === c.id ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"
                          }`}
                        >
                          {c.image_url && (
                            <img src={c.image_url} alt={c.name} loading="lazy" className="h-16 w-24 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Up to {c.max_passengers ?? "—"} passengers · {c.max_luggage ?? "—"} suitcases
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[var(--gold-ink)]">
                              {fixed != null
                                ? `From £${fixed.toFixed(2)} for this tour`
                                : c.hourly_rate
                                  ? `£${Number(c.hourly_rate).toFixed(2)} per hour`
                                  : "Price on request"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
                {classes.every((c) => (c.max_passengers ?? 99) < passengers) && (
                  <p className="text-sm font-semibold text-destructive">
                    No single vehicle seats {passengers}. Please call us and we'll arrange two cars.
                  </p>
                )}
              </div>
            )}

            {/* 5. Stops */}
            {step === 4 && (
              <div className="space-y-5">
                <StepTitle title="Which stops would you like?" />

                {/* Miles and time, live as stops are chosen */}
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">
                      Your {hours}-hour tour includes {includedMiles} miles
                    </p>
                    {priceMutation.isPending ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" /> Measuring your route…
                      </span>
                    ) : liveQuote ? (
                      <span className="text-xs font-semibold">
                        {Math.round(liveQuote.routeMiles)} miles so far
                        {liveQuote.extraMiles > 0
                          ? ` · ${Math.round(liveQuote.extraMiles)} extra miles at £${liveQuote.extraMileRate.toFixed(2)}`
                          : " · inside your allowance"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                    <div
                      className={`h-full rounded-full ${
                        liveQuote && liveQuote.extraMiles > 0 ? "bg-[var(--gold)]" : "bg-[var(--gold-ink)]"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          liveQuote && includedMiles > 0
                            ? (liveQuote.routeMiles / includedMiles) * 100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Miles are counted from your pickup, round every stop and back again. Going further is
                    fine — the extra miles are added to your price and shown before you pay.
                  </p>
                  {liveQuote && liveQuote.state !== "comfortable" && (
                    <div className="mt-3 rounded-xl border border-[var(--gold)]/50 bg-[var(--gold)]/10 p-3">
                      <p className="flex items-start gap-2 text-xs font-semibold">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {liveQuote.blockedReason ??
                          `This is a lot of driving for ${hours} hours — about ${Math.max(0, Math.round(liveQuote.perStopMinutes))} minutes at each stop.`}
                      </p>
                      {quote?.addHours.map((o) => (
                        <button
                          key={o.hours}
                          type="button"
                          onClick={() => { setHours(o.hours); setQuote(null); }}
                          className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 text-left text-xs hover:border-[var(--gold)]"
                        >
                          <span className="font-semibold">Make it {o.hours} hours</span> — about{" "}
                          {Math.round(o.perStopMinutesAfter)} minutes at each stop and{" "}
                          {o.extraAllowanceMiles} more miles included, £{o.netCost.toFixed(2)} more.
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {mode === "premade" && template && (
                  <div className="space-y-2">
                    {template.stops
                      .slice()
                      .sort((a, b) => a.stop_order - b.stop_order)
                      .map((s) => {
                        const on = stops.some((x) => x.poiId === s.poi_id);
                        return (
                          <label
                            key={s.poi_id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={s.mandatory}
                              onChange={(e) => {
                                setQuote(null);
                                setStops((prev) =>
                                  e.target.checked
                                    ? [...prev, {
                                        poiId: s.poi_id, placeId: s.place_id, name: s.name,
                                        dwellMinutes: s.recommended_visit_minutes,
                                      }]
                                    : prev.filter((x) => x.poiId !== s.poi_id),
                                );
                              }}
                              className="mt-1 accent-[var(--gold)]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                About {s.recommended_visit_minutes} minutes here
                                {s.mandatory ? " · always included" : ""}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    <p className="text-xs text-muted-foreground">
                      Taking a stop off doesn't reduce the fixed tour price — it just gives you longer
                      at the rest.
                    </p>
                  </div>
                )}
                  <div className="space-y-3">
                    {stops
                      .map((s, i) => ({ s, i }))
                      .filter(
                        ({ s }) =>
                          !(mode === "premade" && template?.stops.some((t) => t.poi_id === s.poiId)),
                      )
                      .map(({ s, i }) => (
                      <div key={`${s.placeId}-${i}`} className="flex items-center gap-3 rounded-xl border border-border p-3">
                        <MapPin className="size-4 shrink-0 text-[var(--gold-ink)]" />
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</p>
                        <label className="text-xs text-muted-foreground">
                          minutes
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={s.dwellMinutes ?? ""}
                            onChange={(e) => {
                              const v = e.target.value === "" ? null : Number(e.target.value);
                              setQuote(null);
                              setStops((prev) => prev.map((x, j) => (j === i ? { ...x, dwellMinutes: v } : x)));
                            }}
                            className="ml-2 w-16 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold"
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => { setQuote(null); setStops((prev) => prev.filter((_, j) => j !== i)); }}
                          aria-label={`Remove ${s.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Label htmlFor="tw-stop">Add a stop</Label>
                        <PlaceAutocomplete id="tw-stop" value={newStop} onChange={setNewStop} placeholder="Castle, loch, distillery…" />
                      </div>
                      <Button
                        type="button"
                        variant="gold"
                        disabled={!newStop || stops.length >= 15}
                        onClick={() => {
                          if (!newStop) return;
                          setQuote(null);
                          setStops((prev) => [
                            ...prev,
                            {
                              poiId: null,
                              placeId: newStop.placeId,
                              name: newStop.label,
                              dwellMinutes: data?.rules.minimum_stop_minutes ?? 20,
                            },
                          ]);
                          setNewStop(null);
                        }}
                      >
                        <Plus className="size-4" /> Add
                      </Button>
                    </div>

                    {/* Suggested stops inside the mileage the hours include */}
                    <div className="pt-2">
                      <p className="text-sm font-semibold">
                        Places that fit {includedMiles} miles from {start?.label ?? "your pickup"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The ones marked as extra miles are further out. You can still choose them — we'll
                        price the extra mileage for you.
                      </p>
                      {suggestions.isLoading ? (
                        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" /> Finding places within your miles…
                        </p>
                      ) : (suggestions.data?.suggestions.length ?? 0) === 0 ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          No suggestions for this pickup yet — search for any place above and we'll work
                          out the miles.
                        </p>
                      ) : (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {suggestions.data!.suggestions.map((p) => {
                            const chosen = stops.some((s) => s.poiId === p.id || s.placeId === p.placeId);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setQuote(null);
                                  setStops((prev) =>
                                    chosen
                                      ? prev.filter((s) => s.poiId !== p.id && s.placeId !== p.placeId)
                                      : prev.length >= 15
                                        ? prev
                                        : [
                                            ...prev,
                                            {
                                              poiId: p.id,
                                              placeId: p.placeId,
                                              name: p.name,
                                              dwellMinutes: p.recommendedMinutes,
                                            },
                                          ],
                                  );
                                }}
                                className={`flex gap-3 rounded-2xl border p-3 text-left transition ${
                                  chosen
                                    ? "border-[var(--gold)] ring-1 ring-[var(--gold)]"
                                    : "border-border hover:border-[var(--gold)]"
                                }`}
                              >
                                {p.imageUrl && (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    loading="lazy"
                                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                                  />
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {p.roundTripMiles > 0 ? `${p.roundTripMiles} miles there and back · ` : ""}
                                    about {p.recommendedMinutes} minutes here
                                  </span>
                                  <span
                                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                      p.withinAllowance
                                        ? "bg-[var(--surface)] text-[var(--gold-ink)]"
                                        : "bg-[var(--gold)]/20 text-[var(--gold-ink)]"
                                    }`}
                                  >
                                    {chosen ? "Added" : p.withinAllowance ? "Within your miles" : "Extra miles"}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            )}

            {/* 6. Price */}
            {step === 5 && (
              <div className="space-y-5">
                <StepTitle title="Your price" />
                {priceMutation.isPending && !quote ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Working out your day…
                  </p>
                ) : quote ? (
                  <>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <ul className="space-y-2 text-sm">
                        {quote.quote.lines.map((l, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-4">
                            <span>
                              {l.label}
                              {l.detail ? <span className="text-muted-foreground"> · {l.detail}</span> : null}
                            </span>
                            <span className="font-semibold">£{l.amount.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                        <span className="font-semibold">Total</span>
                        <span className="font-display text-2xl font-bold text-[var(--gold-ink)]">
                          £{quote.quote.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 text-sm">
                      <Meter label="Hours booked" value={`${quote.quote.hours} hours`} />
                      <Meter
                        label="Miles"
                        value={`${Math.round(quote.quote.routeMiles)} of ${quote.quote.includedMiles} included`}
                      />
                      <Meter label="Time at stops" value={minutesLabel(quote.quote.exploreMinutes)} />
                    </div>

                    {quote.quote.state !== "comfortable" && (
                      <div className="rounded-2xl border border-[var(--gold)]/50 bg-[var(--gold)]/10 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <AlertTriangle className="size-4" />
                          {quote.quote.blockedReason ?? "This day is tight — you'll be rushing between stops."}
                        </p>
                        {quote.addHours.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {quote.addHours.map((o) => (
                              <button
                                key={o.hours}
                                type="button"
                                onClick={() => { setHours(o.hours); setQuote(null); priceMutation.mutate(); }}
                                className="w-full rounded-xl border border-border bg-background p-3 text-left text-sm hover:border-[var(--gold)]"
                              >
                                <span className="font-semibold">Make it {o.hours} hours</span> — about{" "}
                                {Math.round(o.perStopMinutesAfter)} minutes at each stop, {o.extraAllowanceMiles} more
                                miles included, £{o.netCost.toFixed(2)} more.
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => priceMutation.mutate()}
                      disabled={priceMutation.isPending}
                    >
                      {priceMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Recheck price
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="gold" onClick={() => priceMutation.mutate()}>
                    Get my price
                  </Button>
                )}
              </div>
            )}

            {/* 7. Details & payment */}
            {step === 6 && (
              <div className="space-y-5">
                {created ? (
                  <>
                    <StepTitle title="Pay to confirm your tour" />
                    <div className="rounded-2xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Your reference
                      </p>
                      <p className="font-mono text-lg font-bold tracking-wider">{created.bookingRef}</p>
                      <p className="mt-1 text-sm">
                        Total to pay: <strong>£{created.total.toFixed(2)}</strong>
                      </p>
                    </div>
                    <BookingCardPayment
                      serverPriced
                      amountPence={Math.round(created.total * 100)}
                      bookingRef={created.bookingRef}
                      email={email}
                      returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/booking/${created.bookingRef}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your tour is held until payment is completed. You can track or change it later on{" "}
                      <Link to="/manage-booking" className="font-semibold underline">manage booking</Link>.
                    </p>
                  </>
                ) : (
                  <form
                    className="space-y-5"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!name.trim() || !/.+@.+\..+/.test(email) || phone.trim().length < 6) {
                        toast.error("Please add your name, email and phone number.");
                        return;
                      }
                      bookMutation.mutate();
                    }}
                  >
                    <StepTitle title="Your details" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="tw-name">Full name</Label>
                        <Input id="tw-name" required value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tw-email">Email</Label>
                        <Input id="tw-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tw-phone">Phone</Label>
                        <PhoneInput id="tw-phone" value={phone} onChange={setPhone} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tw-flight">Flight (optional)</Label>
                        <Input id="tw-flight" value={flight} onChange={(e) => setFlight(e.target.value)} placeholder="e.g. BA1448" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="tw-notes">Anything we should know? (optional)</Label>
                        <Textarea id="tw-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                    </div>

                    {captcha.widget}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="size-4 text-[var(--gold-ink)]" />
                        {quote ? `£${quote.quote.total.toFixed(2)} total — paid securely by card.` : "Secure card payment."}
                      </p>
                      <Button
                        type="submit"
                        variant="gold"
                        className="min-w-[180px] rounded-full"
                        disabled={bookMutation.isPending || !captcha.ready}
                      >
                        {bookMutation.isPending ? (
                          <><Loader2 className="size-4 animate-spin" /> Saving…</>
                        ) : (
                          "Continue to payment"
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Navigation */}
            {!(step === 6 && created) && (
              <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ArrowLeft className="size-4" /> Back
                </Button>
                {step < 6 && (
                  <div className="flex items-center gap-3">
                    {step === 5 && quote && (
                      <span className="text-sm font-semibold">£{quote.quote.total.toFixed(2)}</span>
                    )}
                    <Button
                      type="button"
                      variant="gold"
                      className="min-w-[150px] rounded-full"
                      disabled={!canNext}
                      onClick={() => setStep((s) => Math.min(6, s + 1))}
                    >
                      Continue <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Summary strip */}
        {(templateId || mode === "custom") && step > 0 && (
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {template ? template.name : "Custom day tour"}
            </span>
            {date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> {date} · {time}</span>}
            {hours && <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {hours} hours</span>}
            {vehicle && <span>{vehicle.name}</span>}
            {fixedPriceForVehicle != null && <span>Fixed tour price £{fixedPriceForVehicle.toFixed(2)}</span>}
          </p>
        )}
      </section>
    </SiteLayout>
  );
}

/** "09:00" plus 8 hours -> "17:00". */
function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map((v) => Number(v));
  const total = ((h ?? 0) * 60 + (m ?? 0) + Math.round(hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function StepTitle({ title }: { title: string }) {
  return <h2 className="font-display text-xl md:text-2xl font-bold">{title}</h2>;
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function NumberField({
  icon, label, value, min, max, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
      <div className="flex size-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--gold-ink)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</div>
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          className="w-full bg-transparent text-sm font-semibold outline-none"
        />
      </div>
    </div>
  );
}
