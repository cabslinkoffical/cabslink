/**
 * The shared day booking wizard behind /book/tour (private day tours) and
 * /book/hourly (hourly hire). Both use the same server pricing and booking
 * path; `kind` only changes the wording, hides ready-made tours for hourly
 * hire and makes stops optional there.
 */
import { ukDate } from "@/lib/uk-time";
import { FACT_TEXT } from "@/lib/site-facts";
import { flightNumberError, isAirportPickup } from "@/lib/flight-number";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { rememberCheckout, trackEvent } from "@/lib/analytics-ga";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Loader2, MapPin, Users,
  Briefcase, AlertTriangle, Plus, Trash2, ShieldCheck, Route as RouteIcon,
  ChevronUp, ChevronDown, GripVertical, Lock, LockOpen, RotateCcw, Wand2, Copy, Send,
} from "lucide-react";
import { createCustomTourRequest } from "@/lib/custom-tour-requests.functions";
import { quoteRequestReason } from "@/lib/custom-tour-requests";
import { moveStop } from "@/lib/stop-order";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PassengerConfirmation } from "@/components/site/PassengerConfirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/site/PhoneInput";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { useCaptcha } from "@/components/site/Captcha";
import { BookingCardPayment } from "@/components/site/BookingCardPayment";
import { PayAnotherWay } from "@/components/site/PayAnotherWay";
import { useBookingStepScroll } from "@/components/site/useBookingStepScroll";
import { TourLoopMap } from "@/components/site/TourLoopMap";
import { toast } from "sonner";
import { minutesLabel } from "@/lib/tour-quote";
import {
  getTourBookingOptions,
  getTourStopSuggestions,
  quoteTour,
  createTourBooking,
  optimiseTourStops,
  type TourBookingOptions,
  type TourOptimiseResult,
} from "@/lib/tour-booking.functions";
import type { TourQuoteResult } from "@/lib/tour-quote.server";



export type DayWizardKind = "tour" | "hourly";

export type DayWizardSearch = {
  tour?: string;
  pickupPlaceId?: string;
  pickupLabel?: string;
  date?: string;
  time?: string;
  hours?: number;
  passengers?: number;
  luggage?: number;
  /** Hand-off from the Tours page builder. */
  endPlaceId?: string;
  endLabel?: string;
  /** `placeId::label::minutes` joined with `|`. */
  stops?: string;
};

type Stop = { poiId: string | null; placeId: string; name: string; dwellMinutes: number | null; locked?: boolean };

export function parseStopsParam(raw: string | undefined): Stop[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((part) => {
      const [placeId, label, minutes] = part.split("::");
      if (!placeId) return null;
      let name = placeId;
      try { name = decodeURIComponent(label ?? "") || placeId; } catch { name = label || placeId; }
      const m = Number(minutes);
      return { poiId: null, placeId, name, dwellMinutes: Number.isFinite(m) ? m : null } as Stop;
    })
    .filter((s): s is Stop => !!s)
    .slice(0, 15);
}

const TOUR_STEPS = ["Your day", "Tour & stops", "Vehicle & price", "Details & pay"];
const HOURLY_STEPS = ["Your hire", "Stops (optional)", "Vehicle & price", "Details & pay"];

export function DayBookingWizard({ kind = "tour", search }: { kind?: DayWizardKind; search: DayWizardSearch }) {
  const hourly = kind === "hourly";
  const STEPS = hourly ? HOURLY_STEPS : TOUR_STEPS;
  const { tour: tourParam } = search;
  const [prefilled, setPrefilled] = useState(false);
  const options = useQuery<TourBookingOptions>({
    queryKey: ["tour-booking-options"],
    queryFn: () => getTourBookingOptions(),
    staleTime: 5 * 60_000,
  });

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"premade" | "custom">("custom");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [start, setStart] = useState<SelectedPlace | null>(null);
  const [end, setEnd] = useState<SelectedPlace | null>(null);
  const [sameEnd, setSameEnd] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState<number | null>(null);
  const [vehicleClassId, setVehicleClassId] = useState<string | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [passengersConfirmed, setPassengersConfirmed] = useState(false);
  const [luggage, setLuggage] = useState(2);
  const [stops, setStops] = useState<Stop[]>([]);
  // Best-order suggestion: shown first, applied only when the customer agrees.
  const [bestOrder, setBestOrder] = useState<TourOptimiseResult | null>(null);
  const [orderBeforeBest, setOrderBeforeBest] = useState<Stop[] | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [newStop, setNewStop] = useState<SelectedPlace | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flight, setFlight] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<TourQuoteResult | null>(null);
  const [created, setCreated] = useState<{ bookingRef: string; total: number } | null>(null);
  /** Custom tours only: send the day to the tour team for a price instead of paying now. */
  const [requestMode, setRequestMode] = useState(false);
  const [requested, setRequested] = useState<{ reference: string } | null>(null);
  useBookingStepScroll(`${step}:${created?.bookingRef ?? ""}:${requested?.reference ?? ""}`);
  useEffect(() => { if (step < 3) setRequestMode(false); }, [step]);
  const [showAllTours, setShowAllTours] = useState(false);

  const captcha = useCaptcha("tour-booking");
  const data = options.data;
  const tours = data?.tours ?? [];
  const classes = data?.classes ?? [];
  const tiers = data?.tiers ?? [];
  const template = tours.find((t) => t.id === templateId) ?? null;

  // Deep link from a tour page.
  useEffect(() => {
    if (hourly || !tourParam || !tours.length || templateId) return;
    const match = tours.find((t) => t.slug === tourParam);
    if (match) {
      setMode("premade");
      selectTemplate(match.id);
      setStep(0);
    }
  }, [tourParam, tours.length]);

  // Hand-off from the hourly hire form: pickup, day, hours and party are known,
  // so fill them in and open on the tours-and-stops choice.
  useEffect(() => {
    if (prefilled || !data) return;
    if (!search.pickupPlaceId) return;
    setStart({ placeId: search.pickupPlaceId, label: search.pickupLabel || search.pickupPlaceId } as SelectedPlace);
    if (search.endPlaceId && search.endPlaceId !== search.pickupPlaceId) {
      setSameEnd(false);
      setEnd({ placeId: search.endPlaceId, label: search.endLabel || search.endPlaceId } as SelectedPlace);
    }
    const handedStops = parseStopsParam(search.stops);
    if (handedStops.length) {
      setMode("custom");
      setStops(handedStops.map((x) => ({ ...x, dwellMinutes: Math.max(data.rules.minimum_stop_minutes ?? 10, x.dwellMinutes ?? 0) })));
    }
    if (search.date) setDate(search.date);
    if (search.time) setTime(search.time);
    if (search.passengers) { setPassengers(search.passengers); setPassengersConfirmed(true); }
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
    // Everything step 1 asks for is already known, so open on tours and stops.
    if (search.date && search.time && search.hours) setStep(1);
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
          dwellMinutes: Math.max(minStopMinutes, s.recommended_visit_minutes ?? minStopMinutes),
        })),
    );
  }

  function chooseCustom() {
    setMode("custom");
    setTemplateId(null);
    setStops([]);
    setQuote(null);
    if (!hours) setHours(tiers[0]?.hours ?? 8);
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
  const vehicleFits = classes.some((c) => (c.max_passengers ?? 99) >= passengers);
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
    onSuccess: (res) => {
      setQuote(res);
      if (res?.quote && !res.quote.blockedReason && res.quote.total > 0) {
        trackEvent("view_quote", { service_type: "tour", vehicle_class: vehicle?.name, value: res.quote.total, currency: "GBP" });
      }
    },
    onError: (e: Error) => toast.error(e.message || "We couldn't price that tour."),
  });

  const optimiseMutation = useMutation({
    mutationFn: async () =>
      optimiseTourStops({
        data: {
          startPlaceId: start!.placeId,
          endPlaceId: sameEnd ? null : end?.placeId ?? null,
          stops: stops.map((x) => ({ placeId: x.placeId, locked: !!x.locked })),
        },
      }),
    onSuccess: (res) => setBestOrder(res),
    onError: (e: Error) => toast.error(e.message || "We couldn't work out a better order right now."),
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
          kind,
          website: "",
          captchaToken: captcha.token,
        },
      }),
    onSuccess: (res) => {
      if (!res.bookingRef) return;
      setCreated({ bookingRef: res.bookingRef, total: res.total });
      setStep(3);
    },
    onError: (e: Error) => {
      captcha.reset();
      toast.error(e.message || "We couldn't save your tour. Please try again.");
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const req = quoteReq();
      return createCustomTourRequest({
        data: {
          startPlaceId: req.startPlaceId,
          startLabel: req.startLabel,
          endPlaceId: req.endPlaceId,
          endLabel: req.endLabel,
          hours: req.hours,
          vehicleClassId: vehicleClassId && vehicleFits ? vehicleClassId : null,
          passengers,
          luggage,
          stops: stops.map((s) => ({ poiId: s.poiId, placeId: s.placeId, name: s.name, dwellMinutes: s.dwellMinutes, locked: !!s.locked })),
          originalStops: orderBeforeBest
            ? orderBeforeBest.map((s) => ({ poiId: s.poiId, placeId: s.placeId, name: s.name, dwellMinutes: s.dwellMinutes, locked: !!s.locked }))
            : null,
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
      });
    },
    onSuccess: (res) => {
      if (!res.reference) return;
      setRequested({ reference: res.reference });
      trackEvent("generate_lead", { service_type: "custom_tour_request" });
    },
    onError: (e: Error) => {
      captcha.reset();
      toast.error(e.message || "We couldn't send your request. Please try again or call us.");
    },
  });

  /** Custom tours can always be sent for a personal quote; this says why when no instant price is possible. */
  const canRequestQuote = !hourly && mode === "custom" && stops.length > 0;
  const requestWhy = canRequestQuote && passengersConfirmed && !priceMutation.isPending
    ? quoteRequestReason({
        priceError: !quote && priceMutation.isError ? (priceMutation.error as Error)?.message ?? "error" : null,
        blockedReason: quote?.quote.blockedReason ?? null,
        total: quote ? quote.quote.total : null,
        vehicleFits,
      })
    : null;

  // Ask the server for a price whenever the customer reaches the price step.
  useEffect(() => {
    if (step === 2 && passengersConfirmed && start && hours && vehicleClassId && !priceMutation.isPending) {
      priceMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, passengersConfirmed, passengers, vehicleClassId]);

  // On the stops step, keep the miles and time meter honest as stops change.
  useEffect(() => {
    if (step !== 1 || !start || !hours || !vehicleClassId) return;
    const t = setTimeout(() => priceMutation.mutate(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stops, hours, vehicleClassId, sameEnd, end?.placeId]);

  // Curated stops that fit the mileage the chosen hours include.
  const suggestions = useQuery({
    queryKey: ["tour-stop-suggestions", start?.placeId ?? "", hours ?? 0],
    enabled: step === 1 && !!start?.placeId && !!hours,
    staleTime: 5 * 60_000,
    queryFn: () =>
      getTourStopSuggestions({ data: { startPlaceId: start!.placeId, hours: hours!, limit: 24 } }),
  });


  // Admin-set shortest stay at any stop; customers may ask for longer, never less.
  const minStopMinutes = data?.rules.minimum_stop_minutes ?? 10;

  // Pick a sensible vehicle up front so the miles-and-time meter can measure the
  // day while stops are chosen; the customer can change it on the next step.
  useEffect(() => {
    // Once passengers are confirmed, never fall back to a vehicle too small for them.
    if (vehicleClassId || !classes.length || passengersConfirmed) return;
    const fit = classes.find((c) => (c.max_passengers ?? 99) >= passengers) ?? classes[0]!;
    setVehicleClassId(fit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length, passengers]);

  const today = ukDate();
  const canNext = (() => {
    switch (step) {
      case 0: return !!start && !!date && !!time && (sameEnd || !!end) && !!hours && fitsDay;
      case 1: return hourly ? true : mode === "custom" ? stops.length > 0 : !!templateId;
      case 2:
        return passengersConfirmed && !!vehicleClassId && (vehicle?.max_passengers ?? 0) >= passengers && passengers > 0 && !!quote && !quote.quote.blockedReason;
      default: return false;
    }
  })();

  return (
    <SiteLayout hideCta>
      <section className="mx-auto max-w-6xl px-4 pt-28 pb-16 md:pt-32">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">
          {hourly ? "Hourly hire" : "Private day tours"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{hourly ? "Book a car and driver by the hour" : "Build your day tour"}</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          {hourly
            ? "Your car and driver stay with you for the hours you book, with miles included. Add places you want to visit if you like, or leave it open and tell your driver on the day."
            : "Choose one of our ready-made tours or build your own day. We'll show you exactly what fits in the day and what it costs before you pay."}
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
                      : "border-border text-muted-foreground"
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
            <Loader2 className="size-4 animate-spin" /> {hourly ? "Loading…" : "Loading tours…"}
          </div>
        ) : options.isError ? (
          <p className="mt-10 text-sm font-semibold text-destructive">
            We couldn't load the tour options. Please refresh, or call us and we'll book it for you.
          </p>
        ) : (
          <div className="mt-8 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 rounded-2xl border border-border bg-[var(--surface)] p-5 md:p-7">
            {/* 2a. Ready-made or custom — one segmented choice */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--navy)] text-sm font-bold text-[var(--gold)]">2</span>
                  <h2 className="font-display text-2xl font-extrabold">{hourly ? "Stops (optional)" : <>Tour &amp; stops</>}</h2>
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">Step 2 of 4</span>
                </div>

                {hourly ? (
                  <p className="text-sm text-muted-foreground">Add any places you want to visit and we'll check they fit in your hours. No stops? Just continue: your driver stays with you for the hours you book.</p>
                ) : (
                <div
                  role="tablist"
                  aria-label="How to plan your day"
                  className="flex rounded-xl border border-border bg-card p-1 shadow-sm"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "premade"}
                    onClick={() => setMode("premade")}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      mode === "premade"
                        ? "bg-[var(--navy)] text-[var(--navy-foreground)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Ready-made tours
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "custom"}
                    onClick={chooseCustom}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      mode === "custom"
                        ? "bg-[var(--navy)] text-[var(--navy-foreground)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Build my own
                  </button>
                </div>
                )}

                {mode === "premade" ? (
                  <section aria-labelledby="ready-made-heading" className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <h3 id="ready-made-heading" className="font-display text-lg font-bold">
                        Proven Scottish routes
                      </h3>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {tours.length} options available
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {(showAllTours ? tours : tours.slice(0, 6)).map((t) => {
                        const selected = templateId === t.id;
                        const startingPrice = t.prices.length
                          ? Math.min(...t.prices.map((price) => price.price))
                          : null;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { setMode("premade"); selectTemplate(t.id); }}
                            className={`relative rounded-xl border bg-card p-4 text-left transition ${
                              selected
                                ? "border-[var(--gold)] ring-1 ring-[var(--gold)]"
                                : "border-border hover:border-[var(--gold)] hover:shadow-raised"
                            }`}
                          >
                            {selected && (
                              <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                                <Check className="size-3" />
                              </span>
                            )}
                            <span className="block pr-7 font-display text-base font-bold leading-snug">{t.name}</span>
                            <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <span>{t.default_duration_hours ?? "—"} hours</span>
                              <span aria-hidden="true">·</span>
                              <span>{t.stops.length} {t.stops.length === 1 ? "stop" : "stops"}</span>
                              {t.included_miles ? <><span aria-hidden="true">·</span><span>{t.included_miles} miles</span></> : null}
                            </span>
                            <span className="mt-3 block text-sm font-bold text-[var(--gold-ink)]">
                              {startingPrice == null ? "Price shown with your vehicle" : `From £${startingPrice.toFixed(2)}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {tours.length > 6 && (
                      <div className="flex justify-center">
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowAllTours((value) => !value)}>
                          {showAllTours ? "Show fewer tours" : `View all ${tours.length} tours`}
                        </Button>
                      </div>
                    )}
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add the places you'd like to visit below. We measure the real driving loop from your
                    pickup, round every stop and back again, then price any extra miles before you pay.
                  </p>
                )}
              </div>
            )}

            {/* 1a. Pickup, drop-off, date & time */}
            {step === 0 && (
              <div className="space-y-5">
                <StepTitle title="Your day: where, when and for how long" />
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

            {/* 1b. Hours */}
            {step === 0 && (
              <div className="space-y-5">
                <h3 className="font-display text-lg font-bold">How long would you like the car for?</h3>
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
                    to="/contact"
                    className="mt-2 inline-block text-xs font-semibold underline"
                  >
                    Contact us about a multi-day tour
                  </Link>
                </div>
              </div>
            )}

            {/* 3a. Vehicle & group */}
            {step === 2 && !passengersConfirmed && (
              <PassengerConfirmation max={80} onConfirm={(count) => {
                setPassengers(count);
                const fit = classes.find((c) => (c.max_passengers ?? 0) >= count);
                setVehicleClassId(fit?.id ?? null);
                setQuote(null);
                setPassengersConfirmed(true);
              }} />
            )}
            {step === 2 && passengersConfirmed && (
              <div className="space-y-5">
                <StepTitle title="Which vehicle, and how many of you?" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    icon={<Users className="size-4" />}
                    label="Passengers"
                    value={passengers}
                    min={1}
                    max={80}
                    onChange={(v) => { setPassengers(v); setVehicleClassId(classes.find((c) => (c.max_passengers ?? 0) >= v)?.id ?? null); setQuote(null); }}
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

            {/* 2b. Stops */}
            {step === 1 && (
              <div className="space-y-5 border-t border-border pt-6">
                {/* Your route: live miles and time as stops change */}
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <h3 className="font-display text-lg font-bold">Your route</h3>
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distance</p>
                        <p className="text-sm font-bold">
                          {liveQuote ? Math.round(liveQuote.routeMiles) : 0} / {includedMiles} mi
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time used</p>
                        <p className="text-sm font-bold">
                          {liveQuote
                            ? minutesLabel(liveQuote.driveMinutes + liveQuote.dwellTotalMinutes)
                            : "0h"}{" "}
                          / {hours}h
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
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
                    {priceMutation.isPending ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" /> Measuring your route on the map…
                      </span>
                    ) : liveQuote ? (
                      <>
                        {liveQuote.extraMiles > 0
                          ? `${Math.round(liveQuote.extraMiles)} extra miles at £${liveQuote.extraMileRate.toFixed(2)} each`
                          : "Inside your included miles"}
                        {liveQuote.spareMinutes >= 0
                          ? ` · ${minutesLabel(liveQuote.spareMinutes)} spare in the day`
                          : ` · ${minutesLabel(-liveQuote.spareMinutes)} over your ${hours} hours`}
                      </>
                    ) : (
                      "Add a stop and we'll measure the driving loop from your pickup and back again."
                    )}
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

                {/* The loop itself is drawn in the summary panel beside this step. */}


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
                            className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-border p-3"
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
                                        dwellMinutes: Math.max(minStopMinutes, s.recommended_visit_minutes ?? minStopMinutes),
                                      }]
                                    : prev.filter((x) => x.poiId !== s.poi_id),
                                );
                              }}
                              className="mt-0.5 size-5 shrink-0 accent-[var(--gold)]"
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
                    {stops.length > 0 && (
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="font-display text-base font-bold">Your stops, in order</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Drag or use the arrows · at least {minStopMinutes} minutes each
                        </span>
                      </div>
                    )}
                    {stops
                      .map((s, i) => ({ s, i }))
                      .filter(
                        ({ s }) =>
                          !(mode === "premade" && template?.stops.some((t) => t.poi_id === s.poiId)),
                      )
                      .map(({ s, i }) => (
                      <div
                        key={`${s.placeId}-${i}`}
                        draggable={!s.locked}
                        onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; }}
                        onDragOver={(e) => { if (dragFrom !== null && !s.locked) e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFrom === null) return;
                          setQuote(null);
                          setBestOrder(null);
                          setStops((prev) => moveStop(prev, dragFrom, i));
                          setDragFrom(null);
                        }}
                        onDragEnd={() => setDragFrom(null)}
                        className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
                          dragFrom === i ? "border-[var(--gold)] opacity-60" : "border-border"
                        } ${s.locked ? "bg-[color-mix(in_oklab,var(--gold)_6%,var(--card))]" : ""}`}
                      >
                        <GripVertical
                          className={`size-4 shrink-0 ${s.locked ? "text-muted-foreground/30" : "cursor-grab text-muted-foreground"}`}
                          aria-hidden="true"
                        />
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-[var(--navy-foreground)]">{i + 1}</span>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {s.name}
                          {i === stops.length - 1 && stops.length > 1 && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              last stop
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          aria-pressed={!!s.locked}
                          aria-label={s.locked ? `Unlock ${s.name} so it can move` : `Keep ${s.name} in this position`}
                          title={s.locked ? "Fixed in this position" : "Fix in this position"}
                          onClick={() => { setBestOrder(null); setStops((prev) => prev.map((x, j) => (j === i ? { ...x, locked: !x.locked } : x))); }}
                          className={`rounded-md p-1 ${s.locked ? "text-[var(--gold-ink)]" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {s.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                        </button>
                        <span className="flex shrink-0 flex-col">
                          <button
                            type="button"
                            aria-label={`Move ${s.name} earlier`}
                            disabled={i === 0 || !!s.locked || !!stops[i - 1]?.locked}
                            onClick={() => { setQuote(null); setBestOrder(null); setStops((prev) => moveStop(prev, i, i - 1)); }}
                            className="text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${s.name} later`}
                            disabled={i === stops.length - 1 || !!s.locked || !!stops[i + 1]?.locked}
                            onClick={() => { setQuote(null); setBestOrder(null); setStops((prev) => moveStop(prev, i, i + 1)); }}
                            className="text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="size-4" />
                          </button>
                        </span>
                        <label className="text-xs text-muted-foreground">
                          minutes here
                          <input
                            type="number"
                            min={minStopMinutes}
                            step={5}
                            max={600}
                            value={s.dwellMinutes ?? minStopMinutes}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const v = e.target.value === "" || !Number.isFinite(raw)
                                ? minStopMinutes
                                : Math.max(minStopMinutes, Math.min(600, raw));
                              setQuote(null);
                              setStops((prev) => prev.map((x, j) => (j === i ? { ...x, dwellMinutes: v } : x)));
                            }}
                            className="ml-2 w-16 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold"
                            title={`At least ${minStopMinutes} minutes`}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => { setQuote(null); setBestOrder(null); setStops((prev) => prev.filter((_, j) => j !== i)); }}
                          aria-label={`Remove ${s.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}

                    {stops.length >= 2 && (
                      <div className="rounded-xl border border-border bg-background p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={optimiseMutation.isPending || !start}
                            onClick={() => optimiseMutation.mutate()}
                          >
                            {optimiseMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                            Find the quickest order
                          </Button>
                          {orderBeforeBest && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => { setQuote(null); setStops(orderBeforeBest); setOrderBeforeBest(null); setBestOrder(null); }}
                            >
                              <RotateCcw className="size-4" /> Restore my order
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Drag stops or use the arrows. Lock a stop to keep it where it is. Your start and finish never move.
                          </span>
                        </div>
                        {bestOrder && !bestOrder.changed && (
                          <p className="mt-2 text-sm text-muted-foreground" role="status">
                            Your order is already the quickest by road ({bestOrder.current.miles} miles, about {minutesLabel(bestOrder.current.driveMinutes)} driving).
                          </p>
                        )}
                        {bestOrder && bestOrder.changed && (
                          <div className="mt-3 rounded-lg border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] p-3" role="status">
                            <p className="text-sm font-semibold">
                              A quicker order saves about {minutesLabel(bestOrder.current.driveMinutes - bestOrder.best.driveMinutes)} of driving
                              ({bestOrder.current.miles} → {bestOrder.best.miles} miles).
                            </p>
                            <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
                              {bestOrder.order.map((idx) => (
                                <li key={stops[idx]?.placeId ?? idx}>{stops[idx]?.name}</li>
                              ))}
                            </ol>
                            <div className="mt-3 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="gold"
                                onClick={() => {
                                  setOrderBeforeBest(stops);
                                  setQuote(null);
                                  setStops(bestOrder.order.map((idx) => stops[idx]!).filter(Boolean));
                                  setBestOrder(null);
                                }}
                              >
                                Use this order
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setBestOrder(null)}>
                                Keep my order
                              </Button>
                            </div>
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Driving times are road estimates and don't include time at stops, traffic or breaks.
                        </p>
                      </div>
                    )}
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
                              dwellMinutes: minStopMinutes,
                            },
                          ]);
                          setNewStop(null);
                        }}
                      >
                        <Plus className="size-4" /> Add
                      </Button>
                    </div>

                    {/* Suggested stops inside the mileage the hours include */}
                    <div className="pt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Recommended within {includedMiles} miles of {start?.label ?? "your pickup"}
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
                                              poiId: p.source === "map" ? null : p.id,
                                              placeId: p.placeId,
                                              name: p.name,
                                              dwellMinutes: Math.max(minStopMinutes, p.recommendedMinutes ?? minStopMinutes),
                                            },
                                          ],
                                  );
                                }}
                                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                                  chosen
                                    ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_8%,var(--card))] ring-1 ring-[var(--gold)]"
                                    : "border-dashed border-border hover:border-[var(--gold)]"
                                }`}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold">{p.name}</span>
                                  <span className="mt-0.5 block text-xs font-medium text-[var(--gold-ink)]">
                                    {chosen
                                      ? "Added to your day"
                                      : p.withinAllowance
                                        ? "Within your miles"
                                        : `About ${p.roundTripMiles} miles · extra miles`}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                    about {p.recommendedMinutes} minutes here
                                    {p.source === "map" ? " · found nearby" : ""}
                                  </span>
                                </span>
                                <span className="shrink-0 text-[var(--gold-ink)]">
                                  {chosen ? <Check className="size-5" /> : <Plus className="size-5" />}
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

            {/* 3b. Price */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="font-display text-lg font-bold">Your price</h3>
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
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">{FACT_TEXT.feesIncludedShort}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 text-sm">
                      <Meter label="Hours booked" value={`${quote.quote.hours} hours`} />
                      <Meter
                        label="Miles"
                        value={`${Math.round(quote.quote.routeMiles)} of ${quote.quote.includedMiles} included`}
                      />
                      <Meter
                        label="Driving + stops"
                        value={`${minutesLabel(quote.quote.driveMinutes)} driving · ${minutesLabel(quote.quote.dwellTotalMinutes)} at stops`}
                      />
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
                                <span className="font-semibold">Make it {o.hours} hours</span> —{" "}
                                {o.spareMinutesAfter >= 0
                                  ? `${minutesLabel(o.spareMinutesAfter)} spare in the day`
                                  : "still not quite enough"}
                                , {o.extraAllowanceMiles} more miles included, £{o.netCost.toFixed(2)} more.
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
                ) : vehicleFits ? (
                  <Button type="button" variant="gold" onClick={() => priceMutation.mutate()}>
                    Get my price
                  </Button>
                ) : null}

                {canRequestQuote && passengersConfirmed && !priceMutation.isPending && (
                  requestWhy ? (
                    <div className="rounded-2xl border border-[var(--gold)]/60 bg-[var(--surface)] p-5">
                      <p className="font-display font-bold">Request a quote</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {requestWhy} Send us your day and our tour team will reply with a price. You'll get a reference to check your request.
                      </p>
                      <Button
                        type="button"
                        variant="gold"
                        className="mt-4 rounded-full"
                        onClick={() => { setStep(3); setRequestMode(true); }}
                      >
                        <Send className="size-4" /> Request a quote
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Rather have our tour team look at your day first?{" "}
                      <button
                        type="button"
                        className="font-semibold text-foreground underline underline-offset-2"
                        onClick={() => { setStep(3); setRequestMode(true); }}
                      >
                        Request a quote instead
                      </button>
                    </p>
                  )
                )}
              </div>
            )}

            {/* 4. Details & payment */}
            {step === 3 && (
              <div className="space-y-5">
                {requested ? (
                  <>
                    <StepTitle title="Request submitted" />
                    <div className="rounded-2xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Your custom tour reference
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <p className="font-mono text-xl font-bold tracking-wider">{requested.reference}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            navigator.clipboard?.writeText(requested.reference).then(
                              () => toast.success("Reference copied"),
                              () => toast.error("Couldn't copy. Please note it down."),
                            );
                          }}
                        >
                          <Copy className="size-4" /> Copy
                        </Button>
                      </div>
                      <p className="mt-2 text-sm">
                        Our tour team will check your route and email you a price at <strong>{email}</strong>. No payment is needed yet.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-5">
                      <p className="font-display font-bold">Your selected itinerary</p>
                      <ol className="mt-3 space-y-1.5 text-sm">
                        <li><span className="font-semibold">Start:</span> {start?.label}</li>
                        {stops.map((s, i) => (
                          <li key={`${s.placeId}-${i}`}>{i + 1}. {s.name}{s.dwellMinutes ? <span className="text-muted-foreground"> · {minutesLabel(s.dwellMinutes)}</span> : null}</li>
                        ))}
                        <li><span className="font-semibold">Finish:</span> {sameEnd ? start?.label : end?.label}</li>
                      </ol>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {date} from {time} · {hours} hours · {passengers} {passengers === 1 ? "passenger" : "passengers"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Check your request any time on the{" "}
                      <Link to="/custom-tour-status" search={{ ref: requested.reference }} className="font-semibold text-foreground underline">
                        request status page
                      </Link>{" "}
                      with this reference and your email address.
                    </p>
                  </>
                ) : created ? (
                  <>
                    <StepTitle title="We've received your tour booking request" />
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
                      Pay by card and your tour is confirmed as soon as the payment succeeds. You can track or change it later on{" "}
                      <Link to="/manage-booking" className="font-semibold underline">manage booking</Link>.
                    </p>
                    <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
                      <p className="font-display font-bold">Pay another way (cash, bank transfer or other)</p>
                      <PayAnotherWay bookingRef={created.bookingRef} className="mt-1" />
                    </div>
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
                      const flightMissing = flightNumberError(start?.label, flight);
                      if (flightMissing) {
                        toast.error(flightMissing);
                        document.getElementById("tw-flight")?.focus();
                        return;
                      }
                      if (requestMode) requestMutation.mutate();
                      else bookMutation.mutate();
                    }}
                  >
                    <StepTitle title={requestMode ? "Request a quote: your details" : "Your details"} />
                    {requestMode && (
                      <p className="-mt-2 text-sm text-muted-foreground">
                        We'll send your day, stops and timings to our tour team. They'll email you a price, and you'll get a reference to check your request.
                      </p>
                    )}
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
                        <Label htmlFor="tw-flight">{isAirportPickup(start?.label) ? "Flight number" : "Flight (optional)"}</Label>
                        <Input id="tw-flight" required={isAirportPickup(start?.label)} value={flight} onChange={(e) => setFlight(e.target.value)} placeholder="e.g. BA1448" />
                        {isAirportPickup(start?.label) && <p className="text-xs text-muted-foreground">{FACT_TEXT.flightTracking}</p>}
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
                        {requestMode
                          ? "No payment now. Our tour team will reply with a price for your day."
                          : quote ? `£${quote.quote.total.toFixed(2)} total — pay by card next, or arrange another way with our team.` : "Secure card payments, or arrange another way with our team."}
                      </p>
                      <Button
                        type="submit"
                        variant="gold"
                        className="w-full sm:w-auto sm:min-w-[180px] rounded-full"
                        disabled={bookMutation.isPending || requestMutation.isPending || !captcha.ready}
                      >
                        {bookMutation.isPending || requestMutation.isPending ? (
                          <><Loader2 className="size-4 animate-spin" /> {requestMode ? "Sending…" : "Saving…"}</>
                        ) : requestMode ? (
                          "Send my quote request"
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
            {!(step === 3 && (created || requested)) && (
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
                {step < 3 && (
                  <div className="flex min-w-0 flex-wrap justify-end items-center gap-2 sm:gap-3">
                    {step === 2 && quote && (
                      <span className="text-sm font-semibold">£{quote.quote.total.toFixed(2)}</span>
                    )}
                    <Button
                      type="button"
                      variant="gold"
                      className="sm:min-w-[150px] rounded-full"
                      disabled={!canNext}
                      onClick={() => {
                        if (step === 2 && quote) {
                          rememberCheckout({ service_type: "tour", vehicle_class: vehicle?.name });
                          trackEvent("begin_checkout", { service_type: "tour", vehicle_class: vehicle?.name, value: quote.quote.total, currency: "GBP" });
                        }
                        setStep((s) => Math.min(3, s + 1));
                      }}
                    >
                      Continue <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Running summary of the day — same place as the transfer flow */}
            <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Your day</p>
                <h3 className="mt-0.5 font-display text-lg font-bold">
                  {template ? template.name : hourly ? "Hourly hire" : "Your own day tour"}
                </h3>

                <div className="relative mt-4 pl-6">
                  <div className="absolute bottom-3 left-[9px] top-3 border-l-2 border-dashed border-[var(--gold)]/40" />
                  <div className="relative">
                    <div className="absolute -left-6 top-1.5 size-4 rounded-full bg-[var(--gold)] ring-4 ring-[var(--gold)]/20" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug">{start?.label || "—"}</p>
                  </div>
                  {stops.map((s, i) => (
                    <div key={`${s.placeId}-sum-${i}`} className="relative mt-5">
                      <div className="absolute -left-6 top-1.5 flex size-4 items-center justify-center rounded-full border-2 border-[var(--gold)]/60 bg-[var(--gold)]/20">
                        <span className="text-[8px] font-bold leading-none text-[var(--gold-ink)]">{i + 1}</span>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Stop {i + 1} · {s.dwellMinutes ?? minStopMinutes} min
                      </p>
                      <p className="mt-0.5 text-sm font-semibold leading-snug">{s.name}</p>
                    </div>
                  ))}
                  <div className="relative mt-5">
                    <div className="absolute -left-6 top-1.5 size-4 rounded-full border-2 border-[var(--gold)] bg-card" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Finish</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug">
                      {sameEnd ? start?.label || "Back at your pickup" : end?.label || "—"}
                    </p>
                  </div>
                </div>

                <TourLoopMap
                  className="mt-4"
                  startPlaceId={start?.placeId}
                  startLabel={start?.label}
                  stops={stops.map((s) => ({ placeId: s.placeId, name: s.name }))}
                />

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div>
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <CalendarDays className="size-3 text-[var(--gold-ink)]" /> Date
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{date || "—"}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <Clock className="size-3 text-[var(--gold-ink)]" /> Start
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{time || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hours</p>
                    <p className="mt-0.5 text-sm font-semibold">{hours ? `${hours} hours` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Miles</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {liveQuote
                        ? `${Math.round(liveQuote.routeMiles)} of ${includedMiles}`
                        : includedMiles
                          ? `${includedMiles} included`
                          : "—"}
                    </p>
                  </div>
                </div>

                {(vehicle || liveQuote) && (
                  <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                    {vehicle && (
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Vehicle</span>
                        <span className="font-semibold">{vehicle.name}</span>
                      </p>
                    )}
                    {liveQuote && liveQuote.extraMiles > 0 && (
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Extra miles</span>
                        <span className="font-semibold">{Math.round(liveQuote.extraMiles)}</span>
                      </p>
                    )}
                    {fixedPriceForVehicle != null && !liveQuote && (
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Fixed tour price</span>
                        <span className="font-semibold">£{fixedPriceForVehicle.toFixed(2)}</span>
                      </p>
                    )}
                    {liveQuote && (
                      <p className="flex items-baseline justify-between gap-3 pt-1">
                        <span className="font-semibold">Total</span>
                        <span className="font-display text-xl font-bold text-[var(--gold-ink)]">
                          £{liveQuote.total.toFixed(2)}
                        </span>
                      </p>
                    )}
                    {(liveQuote || fixedPriceForVehicle != null) && (
                      <p className="text-xs font-semibold text-muted-foreground">{FACT_TEXT.feesIncludedShort}</p>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
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
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/70">{label}</div>
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
