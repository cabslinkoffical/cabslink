/**
 * The shared day booking wizard behind /book/tour (private day tours) and
 * /book/hourly (hourly hire). Both use the same server pricing and booking
 * path; `kind` only changes the wording, hides ready-made tours for hourly
 * hire and makes stops optional there.
 *
 * Steps follow src/lib/tour-itinerary.ts: ready-made tours go Tour → Date &
 * pickup → Vehicle & price → Details & pay (their stops are set by the tour);
 * your own tour adds a Stops step. Stops are numbered from the start to the
 * finish, kept in driving order, and each leg shows its road miles and time.
 */
import { ukDate } from "@/lib/uk-time";
import { FACT_TEXT } from "@/lib/site-facts";
import { SITE } from "@/lib/site";
import { flightNumberError, isAirportPickup } from "@/lib/flight-number";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { rememberCheckout, trackEvent } from "@/lib/analytics-ga";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Users, Briefcase, AlertTriangle, Plus, X,
  ShieldCheck, ChevronUp, ChevronDown, RotateCcw, Wand2, Copy, Send, Flag, Car, Minus,
} from "lucide-react";
import { createCustomTourRequest } from "@/lib/custom-tour-requests.functions";
import { quoteRequestReason } from "@/lib/custom-tour-requests";
import { splitGroup, suggestGroups, groupLabel, MAX_GROUP_VEHICLES } from "@/lib/tour-group";
import { moveStop } from "@/lib/stop-order";
import {
  wizardSteps, STEP_LABELS, fitsParty, templateStopsInOrder, tourHourChoices, addHoursToTime,
  automaticTourHours, type WizardStepId,
} from "@/lib/tour-itinerary";
import { DayBookingExtras } from "@/components/site/DayBookingExtras";
import type { CancellationCover } from "@/lib/cancellation-cover";
import { tourLoopQuery } from "@/lib/tour-loop-query";
import { SiteLayout } from "@/components/site/SiteLayout";
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
import {
  getTourBookingOptions,
  getTourStopSuggestions,
  quoteTour,
  createTourBooking,
  optimiseTourStops,
  type TourBookingOptions,
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

const MAX_STOPS = 15;

export function DayBookingWizard({ kind = "tour", search }: { kind?: DayWizardKind; search: DayWizardSearch }) {
  const hourly = kind === "hourly";
  const { tour: tourParam } = search;
  const [prefilled, setPrefilled] = useState(false);
  const options = useQuery<TourBookingOptions>({
    queryKey: ["tour-booking-options"],
    queryFn: () => getTourBookingOptions(),
    staleTime: 5 * 60_000,
  });

  const [mode, setMode] = useState<"premade" | "custom">("custom");
  const [stepId, setStepId] = useState<WizardStepId>(hourly ? "when" : "tour");
  const [tourPicked, setTourPicked] = useState(hourly);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [start, setStart] = useState<SelectedPlace | null>(null);
  const [end, setEnd] = useState<SelectedPlace | null>(null);
  const [sameEnd, setSameEnd] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState<number | null>(null);
  const [vehicleClassId, setVehicleClassId] = useState<string | null>(null);
  /** More than one vehicle for a big group: one class id per vehicle (first = vehicleClassId). */
  const [groupVehicles, setGroupVehicles] = useState<string[]>([]);
  const [showGroup, setShowGroup] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [passengersConfirmed, setPassengersConfirmed] = useState(true);
  const [luggage, setLuggage] = useState(0);
  const [stops, setStops] = useState<Stop[]>([]);
  /** Keep stops in the quickest driving order automatically until the customer moves one by hand. */
  const [autoOrder, setAutoOrder] = useState(true);
  const [orderBeforeBest, setOrderBeforeBest] = useState<Stop[] | null>(null);
  const [newStop, setNewStop] = useState<SelectedPlace | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flight, setFlight] = useState("");
  const [notes, setNotes] = useState("");
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [cover, setCover] = useState<CancellationCover>("standard");
  const [quote, setQuote] = useState<TourQuoteResult | null>(null);
  const [created, setCreated] = useState<{ bookingRef: string; total: number } | null>(null);
  /** Custom tours only: send the day to the tour team for a price instead of paying now. */
  const [requestMode, setRequestMode] = useState(false);
  const [requested, setRequested] = useState<{ reference: string } | null>(null);
  useBookingStepScroll(`${stepId}:${created?.bookingRef ?? ""}:${requested?.reference ?? ""}`);
  useEffect(() => { if (stepId !== "details") setRequestMode(false); }, [stepId]);

  const captcha = useCaptcha("tour-booking");
  const data = options.data;
  const tours = data?.tours ?? [];
  const classes = data?.classes ?? [];
  const tiers = data?.tiers ?? [];
  const template = tours.find((t) => t.id === templateId) ?? null;
  const minStopMinutes = data?.rules.minimum_stop_minutes ?? 10;
  const steps = wizardSteps(kind, mode);
  const stepIndex = Math.max(0, steps.indexOf(stepId));
  const goTo = (id: WizardStepId) => setStepId(id);
  const goNext = () => setStepId(steps[Math.min(steps.length - 1, stepIndex + 1)] ?? "details");
  const goBack = () => setStepId(steps[Math.max(0, stepIndex - 1)] ?? "when");

  // Deep link from a tour page: the tour is chosen, so open on date & pickup.
  useEffect(() => {
    if (hourly || !tourParam || !tours.length || templateId) return;
    const match = tours.find((t) => t.slug === tourParam);
    if (match) {
      selectTemplate(match.id);
      setStepId("when");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourParam, tours.length]);

  // Hand-off from the hourly hire form or the Tours page planner.
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
      setTourPicked(true);
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
    if (search.date && search.time && search.hours && (hourly || handedStops.length)) setStepId("stops");
    else if (handedStops.length) setStepId("when");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, prefilled]);

  function selectTemplate(id: string) {
    const t = tours.find((x) => x.id === id);
    setMode("premade");
    setTourPicked(true);
    setTemplateId(id);
    setQuote(null);
    setOrderBeforeBest(null);
    if (!t) return;
    setHours(t.default_duration_hours ?? tiers[0]?.hours ?? 8);
    setStops(templateStopsInOrder(t.stops, new Set(t.stops.filter((s) => s.default_selected).map((s) => s.poi_id)), minStopMinutes));
  }

  function chooseCustom() {
    if (mode !== "custom" || templateId) setStops([]);
    setMode("custom");
    setTourPicked(true);
    setTemplateId(null);
    setQuote(null);
    setAutoOrder(true);
    if (!hours) setHours(tiers[0]?.hours ?? 8);
  }

  /** Ready-made tours: take an optional stop off or put it back in the tour's own order. */
  function toggleTemplateStop(poiId: string) {
    if (!template) return;
    const chosen = new Set(stops.map((s) => s.poiId).filter((v): v is string => !!v));
    if (chosen.has(poiId)) chosen.delete(poiId); else chosen.add(poiId);
    const kept = new Map(stops.map((s) => [s.poiId, s.dwellMinutes]));
    setQuote(null);
    setStops([...templateStopsInOrder(template.stops, chosen, minStopMinutes).map((s) => ({ ...s, dwellMinutes: kept.get(s.poiId) ?? s.dwellMinutes })), ...stops.filter((s) => !template.stops.some((t) => t.poi_id === s.poiId))]);
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
  /** Vehicles that have an online price for this day (a tour price or an hourly rate). */
  const priceableClasses = classes.filter(
    (c) => (template?.prices.some((p) => p.vehicle_class_id === c.id) ?? false) || Number(c.hourly_rate ?? 0) > 0,
  );
  const fittingClasses = priceableClasses.filter((c) => fitsParty(c, passengers, luggage));
  /** Big enough, but no online price set for this day: shown honestly as price on request. */
  const unpricedFitting = classes.filter((c) => fitsParty(c, passengers, luggage) && !priceableClasses.includes(c));
  const singleFits = fittingClasses.length > 0;
  const groupActive = groupVehicles.length > 1;
  const groupSplit = groupActive ? splitGroup(groupVehicles, classes, passengers, luggage) : null;
  const vehicleFits = groupActive ? !!groupSplit?.ok : singleFits;
  const groupSuggestions = useMemo(
    () => suggestGroups(priceableClasses, passengers, luggage, 3).filter((ids) => ids.length > 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceableClasses.map((c) => c.id).join("|"), passengers, luggage],
  );
  const vehicleLabel = groupActive ? groupLabel(groupVehicles, classes) : vehicle?.name ?? null;
  const priceFor = (classId: string) => template?.prices.find((p) => p.vehicle_class_id === classId)?.price ?? null;

  /** One vehicle when one carries everyone and their bags, otherwise the best combination. */
  function pickVehiclesFor(count: number, bags: number) {
    setQuote(null);
    const fit = priceableClasses.find((c) => fitsParty(c, count, bags));
    if (fit) { setGroupVehicles([]); setVehicleClassId(fit.id); return; }
    const best = suggestGroups(priceableClasses, count, bags, 1)[0];
    setGroupVehicles(best && best.length > 1 ? best : []);
    setVehicleClassId(best?.[0] ?? null);
  }
  function chooseVehicles(ids: string[]) {
    setQuote(null);
    setExtraQty({});
    if (ids.length > 1) { setGroupVehicles(ids); setVehicleClassId(ids[0]!); return; }
    setGroupVehicles([]);
    setVehicleClassId(ids[0] ?? null);
  }
  function changeParty(nextPassengers: number, nextLuggage: number) {
    setPassengers(nextPassengers);
    setLuggage(nextLuggage);
    const current = classes.find((c) => c.id === vehicleClassId);
    if (groupActive || !current || !fitsParty(current, nextPassengers, nextLuggage)) pickVehiclesFor(nextPassengers, nextLuggage);
    else setQuote(null);
  }

  const quoteReq = () => ({
    mode,
    templateId,
    extras: Object.entries(extraQty).map(([key, quantity]) => ({ key, quantity })),
    cancellationCover: cover,
    startPlaceId: start?.placeId ?? "",
    startLabel: start?.label ?? "",
    endPlaceId: sameEnd ? null : end?.placeId ?? null,
    endLabel: sameEnd ? null : end?.label ?? null,
    hours: hours ?? 0,
    vehicleClassId: (groupActive ? groupVehicles[0] : vehicleClassId) ?? "",
    vehicles: groupActive ? groupVehicles : undefined,
    passengers,
    luggage,
    stops: stops.map((s) => ({
      poiId: s.poiId,
      placeId: s.placeId,
      name: s.name,
      dwellMinutes: s.dwellMinutes,
    })),
  });

  // Only the newest price check may set the price shown, so a slower earlier
  // answer (for another vehicle or length) can never replace it.
  const priceSeq = useRef(0);
  const priceMutation = useMutation({
    mutationFn: async () => {
      const id = ++priceSeq.current;
      try {
        return { res: await quoteTour({ data: quoteReq() }), id };
      } catch (e) {
        if (id !== priceSeq.current) return { res: null, id };
        throw e;
      }
    },
    onSuccess: ({ res, id }) => {
      if (!res || id !== priceSeq.current) return;
      setQuote(res);
      if (res?.quote && !res.quote.blockedReason && res.quote.total > 0) {
        trackEvent("view_quote", { service_type: "tour", vehicle_class: vehicle?.name, value: res.quote.total, currency: "GBP" });
      }
    },
    onError: (e: Error) => toast.error(e.message || "We couldn't price that tour."),
  });

  // Automatic driving order: start first, finish last, and every stop in
  // between on the way to the next. Applied only when it saves road time.
  const stopsKey = stops.map((s) => s.placeId).join("|");
  const orderedKey = useRef("");
  const latestKey = useRef(stopsKey);
  latestKey.current = stopsKey;
  const optimiseMutation = useMutation({
    mutationFn: async (snapshot: Stop[]) => ({
      snapshot,
      res: await optimiseTourStops({
        data: {
          startPlaceId: start?.placeId ?? "",
          endPlaceId: sameEnd ? null : end?.placeId ?? null,
          stops: snapshot.map((x) => ({ placeId: x.placeId, locked: false })),
        },
      }),
    }),
    onSuccess: ({ snapshot, res }) => {
      const snapKey = snapshot.map((s) => s.placeId).join("|");
      if (snapKey !== latestKey.current) return; // stops changed meanwhile
      if (!res.changed) { orderedKey.current = snapKey; return; }
      const next = res.order.map((idx) => snapshot[idx]).filter((s): s is Stop => !!s);
      orderedKey.current = next.map((s) => s.placeId).join("|");
      setOrderBeforeBest(snapshot);
      setQuote(null);
      setStops(next);
    },
    onError: () => { orderedKey.current = latestKey.current; },
  });
  useEffect(() => {
    if ((stepId !== "stops" && !(mode === "premade" && stepId === "when")) || !autoOrder || !start || stops.length < 2) return;
    if (orderedKey.current === stopsKey) return;
    const t = setTimeout(() => optimiseMutation.mutate(stops), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, autoOrder, stopsKey, start?.placeId, sameEnd, end?.placeId]);
  useEffect(() => { orderedKey.current = ""; }, [start?.placeId, sameEnd, end?.placeId]);

  function moveByHand(from: number, to: number) {
    setAutoOrder(false);
    setOrderBeforeBest(null);
    setQuote(null);
    setStops((prev) => moveStop(prev, from, to));
  }
  function removeStop(i: number) {
    setQuote(null);
    setOrderBeforeBest(null);
    setStops((prev) => prev.filter((_, j) => j !== i));
  }
  function setDwell(i: number, minutes: number) {
    setQuote(null);
    setStops((prev) => prev.map((x, j) => (j === i ? { ...x, dwellMinutes: minutes } : x)));
  }
  function addStop(stop: Stop) {
    setQuote(null);
    setStops((prev) => (prev.length >= MAX_STOPS || prev.some((s) => s.placeId === stop.placeId) ? prev : [...prev, stop]));
  }

  // Road miles and minutes for each leg, from the same route the map draws.
  const loop = useQuery(tourLoopQuery(start?.placeId, stops.map((s) => s.placeId), sameEnd ? null : end?.placeId));
  const legs = !loop.isFetching && !optimiseMutation.isPending && loop.data?.legs && loop.data.legs.length === stops.length + 1 ? loop.data.legs : null;
  const allowedHours = template ? tourHourChoices(template, tiers.map((t) => t.hours)) : tiers.map((t) => t.hours);
  const autoHours = template && legs && data ? automaticTourHours(allowedHours, template.default_duration_hours ?? 0,
    legs.reduce((sum, leg) => sum + leg.minutes, 0), stops.map((s) => s.dwellMinutes ?? minStopMinutes), minStopMinutes, data.rules.pickup_buffer_minutes) : null;
  useEffect(() => {
    if (mode !== "premade" || autoHours == null || autoHours === hours) return;
    setHours(autoHours);
    setQuote(null);
  }, [mode, autoHours, hours]);

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
          vehicleClassId: groupActive ? groupVehicles[0]! : vehicleClassId && singleFits ? vehicleClassId : null,
          vehicles: groupActive && groupSplit?.ok ? groupVehicles : null,
          passengers,
          luggage,
          stops: stops.map((s) => ({ poiId: s.poiId, placeId: s.placeId, name: s.name, dwellMinutes: s.dwellMinutes, locked: false })),
          originalStops: orderBeforeBest
            ? orderBeforeBest.map((s) => ({ poiId: s.poiId, placeId: s.placeId, name: s.name, dwellMinutes: s.dwellMinutes, locked: false }))
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

  // Every itinerary/extras change invalidates the previous response immediately.
  const priceKey = JSON.stringify(quoteReq());
  useEffect(() => {
    if (stepId === "details") return;
    ++priceSeq.current;
    setQuote(null);
    if (!start || !hours || !vehicleClassId || !vehicleFits || (groupActive && !groupSplit?.ok)) return;
    if (stepId !== "vehicle" && stepId !== "stops" && !(template && stepId === "when")) return;
    const timer = setTimeout(() => priceMutation.mutate(), 650);
    return () => { clearTimeout(timer); ++priceSeq.current; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceKey, stepId]);

  // Curated stops that fit the mileage the chosen hours include.
  const suggestions = useQuery({
    queryKey: ["tour-stop-suggestions", start?.placeId ?? "", hours ?? 0],
    enabled: (stepId === "stops" || (mode === "premade" && stepId === "when")) && !!start?.placeId && !!hours,
    staleTime: 5 * 60_000,
    queryFn: () =>
      getTourStopSuggestions({ data: { startPlaceId: start?.placeId ?? "", hours: hours ?? 0, limit: 24 } }),
  });

  // A working vehicle lets the stops meter measure the day before the party is
  // confirmed; it is not shown as the customer's choice until they confirm.
  useEffect(() => {
    if (vehicleClassId || !classes.length) return;
    const fit = classes.find((c) => fitsParty(c, passengers, luggage)) ?? classes[0]!;
    setVehicleClassId(fit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length]);

  const today = ukDate();
  const canNext = (() => {
    switch (stepId) {
      case "tour": return tourPicked && (mode === "custom" || !!templateId);
      case "when": return !!start && !!date && date >= today && !!time && (sameEnd || !!end) && !!hours && fitsDay && time >= (data?.rules.earliest_start_time ?? "07:00") && (!template || (!!quote && !quote.quote.blockedReason && !priceMutation.isPending && !loop.isFetching && !optimiseMutation.isPending));
      case "stops": return hourly ? true : stops.length > 0;
      case "vehicle":
        return passengersConfirmed && !!vehicleClassId && vehicleFits && (groupActive || !!vehicle && fitsParty(vehicle, passengers, luggage))
          && fitsDay && !priceMutation.isPending && passengers > 0 && !!quote && !quote.quote.blockedReason && quote.quote.total > 0;
      default: return false;
    }
  })();

  const finishLabel = sameEnd ? start?.label || "Back to your pickup" : end?.label || "Your drop-off";
  const done = !!(created || requested);
  const hourChoices = template ? tourHourChoices(template, tiers.map((t) => t.hours)) : tiers.map((t) => t.hours);
  const overviewPoints = stops.flatMap((s) => {
    const p = template?.stops.find((t) => t.place_id === s.placeId);
    return p && p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)
      ? [{ placeId: s.placeId, name: s.name, lat: p.lat, lng: p.lng }] : [];
  });
  const startingPrice = vehicleClassId ? priceFor(vehicleClassId) : template?.prices.length ? Math.min(...template.prices.map((p) => p.price)) : null;

  return (
    <SiteLayout hideCta>
      <section className="mx-auto max-w-6xl px-4 pt-28 pb-16 md:pt-32">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">
          {hourly ? "Hourly hire" : "Private day tours"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
          {hourly ? "Book a car and driver by the hour" : template ? `Book: ${template.name}` : "Book a private day tour"}
        </h1>

        {!done && <WizardStepper steps={steps} current={stepIndex} onPick={(i) => i < stepIndex && goTo(steps[i] ?? "when")} />}

        {options.isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {hourly ? "Loading…" : "Loading tours…"}
          </div>
        ) : options.isError ? (
          <p className="mt-10 text-sm font-semibold text-destructive">
            We couldn't load the tour options. Please refresh, or call us and we'll book it for you.
          </p>
        ) : (
          <div className="mt-6 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 rounded-lg border border-border bg-card p-5 md:p-7">

            {/* Tour: ready-made or your own */}
            {stepId === "tour" && (
              <div className="space-y-5">
                <StepTitle title="Which tour would you like?" />
                <button
                  type="button"
                  onClick={() => { chooseCustom(); setStepId("when"); }}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                    tourPicked && mode === "custom" ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)]"><Plus className="size-5" /></span>
                  <span className="min-w-0">
                    <span className="block font-display text-base font-bold">Build my own day</span>
                    <span className="block text-sm text-muted-foreground">Choose your own stops. We put them in driving order and show the miles between each.</span>
                  </span>
                </button>
                {tours.length > 0 && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Or pick a ready-made tour</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tours.map((t) => {
                        const selected = templateId === t.id;
                        const from = t.prices.length ? Math.min(...t.prices.map((p) => p.price)) : null;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { selectTemplate(t.id); setStepId("when"); }}
                            className={`relative rounded-xl border p-4 text-left transition ${
                              selected ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"
                            }`}
                          >
                            {selected && (
                              <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]"><Check className="size-3" /></span>
                            )}
                            <span className="block pr-7 font-display text-base font-bold leading-snug">{t.name}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {t.default_duration_hours ?? "—"} hours · {t.stops.length} {t.stops.length === 1 ? "stop" : "stops"}
                            </span>
                            <span className="mt-2 block text-sm font-bold text-[var(--gold-ink)]">
                              {from == null ? "Priced by the hour" : `From £${from.toFixed(2)}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Date & pickup */}
            {stepId === "when" && (
              <div className="space-y-6">
                <StepTitle title={template ? "When and where should we pick you up?" : "Your day: where, when and for how long"} />
                {template?.start_mode === "fixed" && template.fixed_start_address && (
                  <p className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-2 text-xs font-medium">
                    This tour starts at {template.fixed_start_address}. Tell us your address and we'll confirm the meeting point.
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="tw-start">Pickup address</Label>
                    <PlaceAutocomplete id="tw-start" value={start} onChange={(p) => { setStart(p); setQuote(null); }} placeholder="Hotel, home or airport" />
                  </div>
                  {sameEnd ? (
                    <div className="md:col-span-2">
                      <button type="button" className="text-xs font-semibold underline" onClick={() => { setSameEnd(false); setQuote(null); }}>
                        Finish somewhere else
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="tw-end">Drop-off</Label>
                        <button type="button" className="text-xs font-semibold underline" onClick={() => { setSameEnd(true); setEnd(null); setQuote(null); }}>
                          Finish where we started
                        </button>
                      </div>
                      <PlaceAutocomplete id="tw-end" value={end} onChange={(p) => { setEnd(p); setQuote(null); }} placeholder="Different drop-off" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="tw-date">Date</Label>
                    <Input id="tw-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tw-time">Start time</Label>
                    <Input id="tw-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                  <Counter icon={<Users className="size-4" />} label="Passengers" value={passengers} min={1} max={80} onChange={(v) => changeParty(v, luggage)} />
                  <Counter icon={<Briefcase className="size-4" />} label="Suitcases" value={luggage} min={0} max={80} onChange={(v) => changeParty(passengers, v)} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">{template ? "Tour length" : "How long would you like the car for?"}</p>
                  {template ? <p className="text-sm font-semibold" aria-live="polite">{hours} hours{loop.isFetching || optimiseMutation.isPending ? " · Checking route…" : ""}</p> : hourChoices.length > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {hourChoices.map((h) => {
                        const miles = tiers.find((t) => t.hours === h)?.included_miles;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => { setHours(h); setQuote(null); }}
                            aria-pressed={hours === h}
                            className={`rounded-xl border px-4 py-2 text-left text-sm ${hours === h ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] font-bold" : "border-border hover:border-[var(--gold)]"}`}
                          >
                            {h} hours{!template && miles ? <span className="block text-[11px] font-normal text-muted-foreground">{miles} miles included</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{hours} hours</p>
                  )}
                  {hours && time && data && (
                    <p className={`text-xs ${fitsDay ? "text-muted-foreground" : "font-semibold text-destructive"}`}>
                      {fitsDay
                        ? `Starts ${time}, finishes about ${addHoursToTime(time, hours)}. Tours run ${data.rules.earliest_start_time}–${data.rules.latest_finish_time}.`
                        : `Starting at ${time}, ${hours} hours would finish after ${data.rules.latest_finish_time}. Choose an earlier start${template ? "" : " or fewer hours"}.`}
                    </p>
                  )}
                  {!template && (
                    <p className="text-xs text-muted-foreground">
                      More than {data?.rules.max_bookable_hours ?? 12} hours or several days?{" "}
                      <Link to="/contact" className="font-semibold underline">Contact us</Link>.
                    </p>
                  )}
                </div>

                {template && (
                  <div className="space-y-3 border-t border-border pt-5">
                    <p className="text-sm font-semibold">Your route</p>
                    <RouteTimeline
                      startLabel={start?.label || "Your pickup"}
                      finishLabel={finishLabel}
                      stops={stops}
                      legs={legs}
                      measuring={loop.isFetching || optimiseMutation.isPending}
                      onDwell={setDwell}
                      onMove={moveByHand}
                      minStopMinutes={minStopMinutes}
                      onRemove={(i) => {
                        const s = stops[i];
                        const ts = template.stops.find((x) => x.poi_id === s?.poiId);
                        if (ts && !ts.mandatory) toggleTemplateStop(ts.poi_id);
                        else if (!ts) removeStop(i);
                      }}
                      canRemove={(s) => !template.stops.find((x) => x.poi_id === s.poiId)?.mandatory}
                    />
                    {template.stops.filter((s) => !stops.some((x) => x.poiId === s.poi_id)).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {template.stops.filter((s) => !stops.some((x) => x.poiId === s.poi_id)).map((s) => (
                          <button key={s.poi_id} type="button" onClick={() => toggleTemplateStop(s.poi_id)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-semibold hover:border-[var(--gold)]">
                            <Plus className="size-3" /> Add back {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {!start && <p className="text-xs text-muted-foreground">Add your pickup to see the miles and driving time between stops.</p>}
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="tw-extra-stop">Add a stop</Label><PlaceAutocomplete id="tw-extra-stop" value={newStop} onChange={setNewStop} placeholder="Castle, loch, distillery…" /></div>
                      <Button variant="gold" disabled={!newStop || stops.length >= MAX_STOPS} onClick={() => { if (!newStop) return; addStop({ poiId: null, placeId: newStop.placeId, name: newStop.label, dwellMinutes: Math.max(minStopMinutes, 30) }); setNewStop(null); }}><Plus className="size-4" /> Add</Button>
                    </div>
                    <h3 className="text-sm font-semibold">Suggested places</h3>
                    {suggestions.isPending && start && <p className="text-xs text-muted-foreground">Finding places…</p>}
                    <div className="flex flex-wrap gap-2">{(showAllSuggestions ? suggestions.data?.suggestions : suggestions.data?.suggestions.slice(0, 8))?.filter((p) => !stops.some((s) => s.placeId === p.placeId)).map((p) => <Button key={p.id} variant="outline" size="sm" className="h-auto max-w-full whitespace-normal text-left" disabled={stops.length >= MAX_STOPS} onClick={() => addStop({ poiId: p.source === "map" ? null : p.id, placeId: p.placeId, name: p.name, dwellMinutes: Math.max(minStopMinutes, p.recommendedMinutes) })}><Plus className="size-3 shrink-0" />{p.name}</Button>)}</div>
                    {(suggestions.data?.suggestions.length ?? 0) > 8 && <Button variant="ghost" size="sm" onClick={() => setShowAllSuggestions((v) => !v)}>{showAllSuggestions ? "Show fewer" : "More places"}</Button>}
                    {loop.isError && <p className="text-sm text-destructive">We couldn't measure your route. Please check your stops.</p>}
                    {legs && autoHours == null && <p className="text-sm font-semibold text-destructive">These stops need more time than this tour allows. Shorten a visit or remove an added stop.</p>}
                    {quote?.quote.blockedReason && <p className="text-sm text-destructive">{quote.quote.blockedReason}</p>}
                    {priceMutation.isError && <p className="text-sm text-destructive">We couldn't price this right now, please try again or call us.</p>}
                  </div>
                )}
              </div>
            )}

            {/* Stops (your own tour / hourly hire) */}
            {stepId === "stops" && (
              <div className="space-y-6">
                <StepTitle title={hourly ? "Places to visit (optional)" : "Your stops"} />
                <p className="-mt-3 text-sm text-muted-foreground">
                  {hourly
                    ? "Add places you want to visit and we'll check they fit your hours, or just continue and tell your driver on the day."
                    : "Add the places you'd like to visit. We number them from your pickup to your finish, in driving order."}
                </p>

                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor="tw-stop">Add a stop</Label>
                    <PlaceAutocomplete id="tw-stop" value={newStop} onChange={setNewStop} placeholder="Castle, loch, distillery…" />
                  </div>
                  <Button
                    type="button"
                    variant="gold"
                    disabled={!newStop || stops.length >= MAX_STOPS}
                    onClick={() => {
                      if (!newStop) return;
                      addStop({ poiId: null, placeId: newStop.placeId, name: newStop.label, dwellMinutes: Math.max(minStopMinutes, 30) });
                      setNewStop(null);
                    }}
                  >
                    <Plus className="size-4" /> Add
                  </Button>
                </div>

                <RouteTimeline
                  startLabel={start?.label || "Your pickup"}
                  finishLabel={finishLabel}
                  stops={stops}
                  legs={legs}
                  measuring={loop.isFetching || optimiseMutation.isPending}
                  minStopMinutes={minStopMinutes}
                  onMove={moveByHand}
                  onRemove={removeStop}
                  onDwell={setDwell}
                />

                {stops.length >= 2 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="status">
                    {optimiseMutation.isPending ? (
                      <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> Putting your stops in driving order…</span>
                    ) : autoOrder ? (
                      <span className="flex items-center gap-1.5"><Wand2 className="size-3.5 text-[var(--gold-ink)]" /> Stops are kept in the quickest driving order.</span>
                    ) : (
                      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => { orderedKey.current = ""; setAutoOrder(true); }}>
                        <Wand2 className="size-4" /> Put in quickest order
                      </Button>
                    )}
                    {orderBeforeBest && !optimiseMutation.isPending && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-semibold text-foreground underline"
                        onClick={() => { setAutoOrder(false); setQuote(null); setStops(orderBeforeBest); setOrderBeforeBest(null); }}
                      >
                        <RotateCcw className="size-3.5" /> Undo
                      </button>
                    )}
                  </div>
                )}

                {/* Miles and hours used */}
                {stops.length > 0 && (
                  <DayMeter
                    quote={liveQuote}
                    addHours={quote?.addHours ?? []}
                    hours={hours ?? 0}
                    includedMiles={includedMiles}
                    pending={priceMutation.isPending}
                    onHours={(h) => { setHours(h); setQuote(null); }}
                  />
                )}

                {/* Suggested stops inside the mileage the hours include */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Popular stops within {includedMiles} miles
                  </p>
                  {suggestions.isLoading ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Finding places…</p>
                  ) : (suggestions.data?.suggestions.length ?? 0) === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Search for any place above and we'll work out the miles.</p>
                  ) : (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(showAllSuggestions ? suggestions.data!.suggestions : suggestions.data!.suggestions.slice(0, 8)).map((p) => {
                          const chosen = stops.some((s) => s.poiId === p.id || s.placeId === p.placeId);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              aria-pressed={chosen}
                              onClick={() => {
                                if (chosen) {
                                  setQuote(null);
                                  setStops((prev) => prev.filter((s) => s.poiId !== p.id && s.placeId !== p.placeId));
                                } else {
                                  addStop({ poiId: p.source === "map" ? null : p.id, placeId: p.placeId, name: p.name, dwellMinutes: Math.max(minStopMinutes, p.recommendedMinutes ?? minStopMinutes) });
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                chosen ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_14%,transparent)]" : "border-border hover:border-[var(--gold)]"
                              }`}
                              title={p.withinAllowance ? "Within your included miles" : `About ${p.roundTripMiles} miles there and back`}
                            >
                              {chosen ? <Check className="size-3.5" /> : <Plus className="size-3.5" />} {p.name}
                            </button>
                          );
                        })}
                      </div>
                      {suggestions.data!.suggestions.length > 8 && (
                        <button type="button" className="mt-2 text-xs font-semibold underline" onClick={() => setShowAllSuggestions((v) => !v)}>
                          {showAllSuggestions ? "Show fewer" : `Show all ${suggestions.data!.suggestions.length}`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Vehicle & price */}
            {stepId === "vehicle" && (
              <div className="space-y-6">
                <StepTitle title="Choose your vehicle" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Counter icon={<Users className="size-4" />} label="Passengers" value={passengers} min={1} max={80} onChange={(v) => changeParty(v, luggage)} />
                  <Counter icon={<Briefcase className="size-4" />} label="Suitcases" value={luggage} min={0} max={80} onChange={(v) => changeParty(passengers, v)} />
                </div>

                {singleFits ? (
                  <div className="space-y-3">
                    {fittingClasses.map((c) => {
                      const fixed = priceFor(c.id);
                      const selected = !groupActive && vehicleClassId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => chooseVehicles([c.id])}
                          aria-pressed={selected}
                          className={`flex w-full items-center gap-4 rounded-xl border p-3 text-left transition ${
                            selected ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"
                          }`}
                        >
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name} loading="lazy" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-[var(--surface)]"><Car className="size-6 text-muted-foreground" /></span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{c.name}</span>
                            <span className="block text-xs text-muted-foreground">Up to {c.max_passengers ?? "—"} passengers · {c.max_luggage ?? "—"} suitcases</span>
                          </span>
                          <span className="shrink-0 text-right">
                            {selected && quote && !priceMutation.isPending && !quote.quote.blockedReason ? (
                              <span className="block font-display text-lg font-bold text-[var(--gold-ink)]">£{quote.quote.total.toFixed(2)}</span>
                            ) : selected && priceMutation.isPending ? (
                              <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <span className="block text-sm font-semibold text-[var(--gold-ink)]">
                                {fixed != null ? `From £${fixed.toFixed(2)}` : c.hourly_rate ? `£${Number(c.hourly_rate).toFixed(2)}/hr` : ""}
                              </span>
                            )}
                            <span className={`mt-1 ml-auto grid size-5 place-items-center rounded-full border ${selected ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-foreground)]" : "border-border"}`}>
                              {selected && <Check className="size-3" />}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-[var(--gold)]/50 bg-[var(--gold)]/10 p-3 text-sm font-semibold">
                    {unpricedFitting.length
                      ? `We can't price a single vehicle for ${passengers} ${passengers === 1 ? "passenger" : "passengers"} online for this day. Choose more than one vehicle below, ${canRequestQuote ? "request a quote" : `or call us on ${SITE.phoneUK}`}.`
                      : `No single vehicle carries ${passengers} ${passengers === 1 ? "passenger" : "passengers"} and ${luggage} ${luggage === 1 ? "suitcase" : "suitcases"}. Choose more than one vehicle below.`}
                  </p>
                )}
                {!singleFits && unpricedFitting.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {unpricedFitting.map((c) => (
                      <li key={c.id}>
                        <span className="font-semibold text-foreground">{c.name}</span> · up to {c.max_passengers ?? "—"} passengers · price on request{canRequestQuote ? " (use Request a quote below)" : ` (call ${SITE.phoneUK})`}
                      </li>
                    ))}
                  </ul>
                )}

                {/* More than one vehicle */}
                {(!singleFits || showGroup || groupActive) ? (
                  <div className="space-y-3 rounded-xl border border-border bg-[var(--surface)] p-4">
                    <p className="text-sm font-semibold">More than one vehicle</p>
                    <p className="text-xs text-muted-foreground">Each vehicle has its own driver and is priced on its own; your total adds them together.</p>
                    {groupSuggestions.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-3">
                        {groupSuggestions.map((ids) => {
                          const on = groupActive && ids.join("|") === groupVehicles.join("|");
                          const list = ids.map((id) => classes.find((c) => c.id === id)!).filter(Boolean);
                          return (
                            <button
                              key={ids.join("|")}
                              type="button"
                              onClick={() => chooseVehicles(ids)}
                              aria-pressed={on}
                              className={`rounded-xl border bg-card p-3 text-left text-sm ${on ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-border hover:border-[var(--gold)]"}`}
                            >
                              <span className="block font-semibold">{groupLabel(ids, classes)}</span>
                              <span className="block text-xs text-muted-foreground">
                                {list.reduce((t, c) => t + Number(c.max_passengers ?? 0), 0)} seats · {list.reduce((t, c) => t + Number(c.max_luggage ?? 0), 0)} suitcases
                              </span>
                              {on && quote && !priceMutation.isPending && <span className="mt-1 block font-bold text-[var(--gold-ink)]">£{quote.quote.total.toFixed(2)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-destructive">
                        We can't fit {passengers} passengers into {MAX_GROUP_VEHICLES} vehicles online. Please call us on {SITE.phoneUK} and we'll plan it with you.
                      </p>
                    )}
                    {groupActive && groupSplit && !groupSplit.ok && <p className="text-sm font-semibold text-destructive">{groupSplit.reason}</p>}
                    {singleFits && (
                      <button type="button" className="text-xs font-semibold underline" onClick={() => { setShowGroup(false); pickVehiclesFor(passengers, luggage); }}>
                        Use one vehicle instead
                      </button>
                    )}
                  </div>
                ) : groupSuggestions.length > 0 ? (
                  <button type="button" className="text-xs font-semibold underline" onClick={() => setShowGroup(true)}>
                    Travelling as a bigger group? Use more than one vehicle
                  </button>
                ) : null}

                {vehicleClassId && <DayBookingExtras classId={groupVehicles[0] ?? vehicleClassId} passengers={passengers} quantities={extraQty} cover={cover} onCover={(v) => { setCover(v); setQuote(null); }} onChange={(key, quantity) => { setExtraQty((prev) => ({ ...prev, [key]: quantity })); setQuote(null); }} />}

                {/* Price */}
                {vehicleFits && (
                  <PriceBox
                    quote={quote}
                    pending={priceMutation.isPending}
                    failed={priceMutation.isError && !quote}
                    onRetry={() => priceMutation.mutate()}
                    onHours={(h) => { setHours(h); setQuote(null); }}
                  />
                )}

                {canRequestQuote && !priceMutation.isPending && (
                  requestWhy ? (
                    <div className="rounded-xl border border-[var(--gold)]/60 bg-[var(--surface)] p-4">
                      <p className="font-semibold">Request a quote</p>
                      <p className="mt-1 text-sm text-muted-foreground">{requestWhy} Send us your day and our tour team will reply with a price.</p>
                      <Button type="button" variant="gold" className="mt-3 rounded-full" onClick={() => { setStepId("details"); setRequestMode(true); }}>
                        <Send className="size-4" /> Request a quote
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Rather have our tour team check your day first?{" "}
                      <button type="button" className="font-semibold text-foreground underline" onClick={() => { setStepId("details"); setRequestMode(true); }}>
                        Request a quote instead
                      </button>
                    </p>
                  )
                )}
              </div>
            )}

            {/* Details & pay */}
            {stepId === "details" && (
              <div className="space-y-5">
                {requested ? (
                  <>
                    <StepTitle title="Request submitted" />
                    <div className="rounded-2xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Your custom tour reference</p>
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
                      <p className="mt-2 text-sm">Our tour team will check your route and email you a price at <strong>{email}</strong>. No payment is needed yet.</p>
                    </div>
                    <RouteTimeline startLabel={start?.label || "Pickup"} finishLabel={finishLabel} stops={stops} legs={legs} />
                    <p className="text-sm text-muted-foreground">
                      Check your request any time on the{" "}
                      <Link to="/custom-tour-status" search={{ ref: requested.reference }} className="font-semibold text-foreground underline">request status page</Link>{" "}
                      with this reference and your email address.
                    </p>
                  </>
                ) : created ? (
                  <>
                    <StepTitle title="We've received your tour booking request" />
                    <div className="rounded-2xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Your reference</p>
                      <p className="font-mono text-lg font-bold tracking-wider">{created.bookingRef}</p>
                      <p className="mt-1 text-sm">Total to pay: <strong>£{created.total.toFixed(2)}</strong></p>
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
                      <p className="-mt-2 text-sm text-muted-foreground">We'll send your day, stops and timings to our tour team. They'll email you a price, and you'll get a reference to check your request.</p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="tw-name">Full name</Label>
                        <Input id="tw-name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tw-email">Email</Label>
                        <Input id="tw-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                        ) : requestMode ? "Send my quote request" : "Continue to payment"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Navigation */}
            {!done && (
              <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button type="button" variant="ghost" className="rounded-full" onClick={goBack} disabled={stepIndex === 0}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                {stepId !== "details" && (
                  <Button
                    type="button"
                    variant="gold"
                    className="sm:min-w-[150px] rounded-full"
                    disabled={!canNext}
                    onClick={() => {
                      if (stepId === "vehicle" && quote) {
                        rememberCheckout({ service_type: "tour", vehicle_class: vehicle?.name });
                        trackEvent("begin_checkout", { service_type: "tour", vehicle_class: vehicle?.name, value: quote.quote.total, currency: "GBP" });
                      }
                      goNext();
                    }}
                  >
                    Continue <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            )}
            </div>

            {/* Price stays visible; long itineraries scroll inside the screen-height panel. */}
            <aside aria-label="Booking summary" className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-raised lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col">
              <div className="shrink-0 bg-navy px-5 py-4 text-navy-foreground">
                <p className="text-xs font-semibold">Total price</p>
                <p className="mt-1 font-display text-3xl font-bold text-gold" aria-live="polite">{priceMutation.isPending || loop.isFetching || optimiseMutation.isPending ? "Checking…" : liveQuote && !liveQuote.blockedReason && liveQuote.total > 0 ? `£${liveQuote.total.toFixed(2)}` : !start && startingPrice != null ? `From £${startingPrice.toFixed(2)}` : "Awaiting route"}</p>
                <p className="mt-1 text-xs text-navy-foreground/70">{FACT_TEXT.feesIncludedShort}</p>
              </div>
              <div className="min-h-0 space-y-3 p-4 lg:overflow-y-auto">
                <h2 className="font-display text-lg font-bold">{template ? template.name : hourly ? "Hourly hire" : "Your own day tour"}</h2>
                {(start || overviewPoints.length > 0) && <TourLoopMap startPlaceId={start?.placeId} startLabel={start?.label} endPlaceId={sameEnd ? null : end?.placeId} overviewPoints={overviewPoints} stops={stops.map((s) => ({ placeId: s.placeId, name: s.name }))} />}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <SummaryItem label="Date" value={date || "—"} />
                  <SummaryItem label="Time" value={hours && time ? `${time}–${addHoursToTime(time, hours)}` : time || "—"} />
                  <SummaryItem label="Length" value={hours ? `${hours} hours` : "—"} />
                  <SummaryItem label="Passengers" value={`${passengers} · ${luggage} cases`} />
                  {vehicleLabel && <SummaryItem label={groupActive ? "Vehicles" : "Vehicle"} value={vehicleLabel} />}
                </dl>
                {liveQuote && !priceMutation.isPending && <ul className="space-y-2 border-t border-border pt-3 text-xs">{liveQuote.lines.map((line, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0">{line.label}</span><span className="shrink-0 font-semibold">£{line.amount.toFixed(2)}</span></li>)}</ul>}
                {start && <>
                  <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">Your route · {stops.length} stops</summary><div className="mt-3"><RouteTimeline compact startLabel={start.label} finishLabel={finishLabel} stops={stops} legs={legs} /></div></details>
                </>}
              </div>
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function StepTitle({ title }: { title: string }) {
  return <h2 className="font-display text-xl md:text-2xl font-bold">{title}</h2>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}

/** Same look as the transfer booking steps: numbered pills on wide screens, compact on phones. */
function WizardStepper({ steps, current, onPick }: { steps: WizardStepId[]; current: number; onPick: (i: number) => void }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2 md:hidden">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">Step {current + 1} of {steps.length}</span>
        <span className="truncate text-sm font-bold">{STEP_LABELS[steps[current]!]}</span>
        <span className="flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full ${i === current ? "w-5 bg-[var(--gold)]" : i < current ? "w-1.5 bg-[var(--navy)]" : "w-1.5 bg-border"}`} />
          ))}
        </span>
      </div>
      <ol className="hidden flex-wrap items-center gap-3 md:flex">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPick(i)}
              disabled={i >= current}
              aria-current={i === current ? "step" : undefined}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                i === current
                  ? "bg-[var(--gold)] text-[var(--gold-foreground)]"
                  : i < current
                    ? "bg-[var(--navy)] text-[var(--gold)] hover:opacity-90"
                    : "border border-border bg-card text-foreground/70"
              }`}
            >
              {i < current ? <Check className="mr-1 inline size-3" /> : `0${i + 1} · `}
              {STEP_LABELS[s]}
            </button>
            {i < steps.length - 1 && <span className="h-px w-5 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

const DWELL_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 240];

/**
 * The day in order: pickup, numbered stops, finish, with the road miles and
 * driving time of each leg between them. Controls appear only when handlers
 * are given, so the same list serves editing and the summary.
 */
function RouteTimeline({
  startLabel, finishLabel, stops, legs, measuring, compact, minStopMinutes = 10,
  onMove, onRemove, onDwell, canRemove,
}: {
  startLabel: string;
  finishLabel: string;
  stops: Stop[];
  legs: Array<{ miles: number; minutes: number }> | null;
  measuring?: boolean;
  compact?: boolean;
  minStopMinutes?: number;
  onMove?: (from: number, to: number) => void;
  onRemove?: (i: number) => void;
  onDwell?: (i: number, minutes: number) => void;
  canRemove?: (s: Stop) => boolean;
}) {
  const totalMiles = legs ? legs.reduce((t, l) => t + l.miles, 0) : null;
  const totalMinutes = legs ? legs.reduce((t, l) => t + l.minutes, 0) : null;
  const Leg = ({ i }: { i: number }) => {
    if (!stops.length) return <div className="h-3" />;
    const leg = legs?.[i];
    return (
      <div className={`flex items-center gap-2 pl-[11px] ${compact ? "py-1" : "py-1.5"}`}>
        <span className="h-6 border-l-2 border-dashed border-[var(--gold)]/60" aria-hidden="true" />
        <span className="pl-4 text-[11px] font-medium text-muted-foreground">
          {leg ? `${leg.miles.toFixed(1)} mi · ${minutesShort(leg.minutes)} drive` : measuring ? "Measuring…" : ""}
        </span>
      </div>
    );
  };
  const dwellChoices = (current: number | null) =>
    [...new Set([...DWELL_OPTIONS.filter((m) => m >= minStopMinutes), Math.max(minStopMinutes, current ?? minStopMinutes)])].sort((a, b) => a - b);

  return (
    <div>
      <ol aria-label="Your route in order">
        <li className="flex items-center gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]"><Flag className="size-3" /></span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Start</span>
            <span className={`block line-clamp-2 break-words font-semibold leading-snug ${compact ? "text-xs" : "text-sm"}`}>{startLabel}</span>
          </span>
        </li>
        <Leg i={0} />
        {stops.map((s, i) => (
          <li key={`${s.placeId}-${i}`}>
            <div className="flex items-center gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-[var(--navy-foreground)]">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block line-clamp-2 break-words font-semibold leading-snug ${compact ? "text-xs" : "text-sm"}`}>{s.name}</span>
                {!onDwell && <span className="block text-[11px] text-muted-foreground">{minutesShort(s.dwellMinutes ?? minStopMinutes)} here</span>}
              </span>
              {onDwell && (
                <select
                  aria-label={`Time at ${s.name}`}
                  value={Math.max(minStopMinutes, s.dwellMinutes ?? minStopMinutes)}
                  onChange={(e) => onDwell(i, Number(e.target.value))}
                  className="h-8 rounded-md border border-border bg-background px-1.5 text-xs font-semibold"
                >
                  {dwellChoices(s.dwellMinutes).map((m) => <option key={m} value={m}>{minutesShort(m)}</option>)}
                </select>
              )}
              {onMove && (
                <span className="flex shrink-0 flex-col">
                  <button type="button" aria-label={`Move ${s.name} earlier`} disabled={i === 0} onClick={() => onMove(i, i - 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-25"><ChevronUp className="size-4" /></button>
                  <button type="button" aria-label={`Move ${s.name} later`} disabled={i === stops.length - 1} onClick={() => onMove(i, i + 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-25"><ChevronDown className="size-4" /></button>
                </span>
              )}
              {onRemove && (canRemove ? canRemove(s) : true) && (
                <button type="button" aria-label={`Remove ${s.name}`} onClick={() => onRemove(i)} className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Leg i={i + 1} />
          </li>
        ))}
        <li className="flex items-center gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-[var(--gold)] bg-card"><Flag className="size-3 text-[var(--gold-ink)]" /></span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Finish</span>
            <span className={`block line-clamp-2 break-words font-semibold leading-snug ${compact ? "text-xs" : "text-sm"}`}>{finishLabel}</span>
          </span>
        </li>
      </ol>
      {!compact && stops.length === 0 && (
        <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No stops yet. Add one above or pick from the suggestions below.</p>
      )}
      {totalMiles != null && totalMinutes != null && stops.length > 0 && (
        <p className={`mt-3 border-t border-border pt-2 font-semibold ${compact ? "text-xs" : "text-sm"}`}>
          {totalMiles.toFixed(1)} miles · {minutesShort(totalMinutes)} driving in total
        </p>
      )}
    </div>
  );
}

/** Miles and hours used against what the chosen length includes, with extra-hour options. */
function DayMeter({
  quote, addHours, hours, includedMiles, pending, onHours,
}: {
  quote: TourQuoteResult["quote"] | null;
  addHours: TourQuoteResult["addHours"];
  hours: number;
  includedMiles: number;
  pending: boolean;
  onHours: (h: number) => void;
}) {
  const used = quote ? quote.driveMinutes + quote.dwellTotalMinutes : 0;
  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time used</p>
          <p className="font-bold">{quote ? `${minutesShort(used)} of ${hours}h` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Miles</p>
          <p className="font-bold">{quote ? `${Math.round(quote.routeMiles)} of ${includedMiles} included` : "—"}</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
        <div
          className={`h-full rounded-full transition-all duration-500 ${quote && quote.state !== "comfortable" ? "bg-destructive" : "bg-[var(--gold)]"}`}
          style={{ width: `${Math.min(100, quote && hours ? (used / (hours * 60)) * 100 : 0)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pending ? "Checking your day…" : quote ? (
          <>
            {quote.extraMiles > 0 ? `${Math.round(quote.extraMiles)} extra miles at £${quote.extraMileRate.toFixed(2)} each` : "Inside your included miles"}
            {quote.spareMinutes >= 0 ? ` · ${minutesShort(quote.spareMinutes)} spare` : ` · ${minutesShort(-quote.spareMinutes)} over your ${hours} hours`}
          </>
        ) : "Add a stop and we'll measure your day."}
      </p>
      {quote && quote.state !== "comfortable" && (
        <div className="mt-3 space-y-2">
          <p className="flex items-start gap-2 text-xs font-semibold">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {quote.blockedReason ?? `That's a lot for ${hours} hours — about ${Math.max(0, Math.round(quote.perStopMinutes))} minutes at each stop.`}
          </p>
          {addHours.map((o) => (
            <button key={o.hours} type="button" onClick={() => onHours(o.hours)} className="w-full rounded-lg border border-border bg-background p-2.5 text-left text-xs hover:border-[var(--gold)]">
              <span className="font-semibold">Make it {o.hours} hours</span> · {o.extraAllowanceMiles} more miles included · £{o.netCost.toFixed(2)} more
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceBox({
  quote, pending, failed, onRetry, onHours,
}: {
  quote: TourQuoteResult | null;
  pending: boolean;
  failed: boolean;
  onRetry: () => void;
  onHours: (h: number) => void;
}) {
  if (pending && !quote) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Working out your price…</p>;
  }
  if (!quote) {
    return failed ? (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold text-destructive">We couldn't price this right now.</span>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onRetry}>Try again</Button>
      </div>
    ) : null;
  }
  const q = quote.quote;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">Your price</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {q.lines.map((l, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4">
              <span>{l.label}{l.detail ? <span className="text-muted-foreground"> · {l.detail}</span> : null}</span>
              <span className="font-semibold">£{l.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-2xl font-bold text-[var(--gold-ink)]">{pending ? <Loader2 className="size-5 animate-spin" /> : `£${q.total.toFixed(2)}`}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {q.hours} hours · {Math.round(q.routeMiles)} of {q.includedMiles} miles included · {FACT_TEXT.feesIncludedShort}
        </p>
      </div>
      {q.state !== "comfortable" && (
        <div className="rounded-xl border border-[var(--gold)]/50 bg-[var(--gold)]/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            {q.blockedReason ?? "This day is tight — you'll be rushing between stops."}
          </p>
          {quote.addHours.map((o) => (
            <button key={o.hours} type="button" onClick={() => onHours(o.hours)} className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 text-left text-xs hover:border-[var(--gold)]">
              <span className="font-semibold">Make it {o.hours} hours</span> · {o.spareMinutesAfter >= 0 ? `${minutesShort(o.spareMinutesAfter)} spare` : "still tight"} · £{o.netCost.toFixed(2)} more
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Counter({
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--gold-ink)]">{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-border disabled:opacity-30"><Minus className="size-4" /></button>
      <span className="w-6 text-center font-bold" aria-live="polite" aria-label={`${label}: ${value}`}>{value}</span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-border disabled:opacity-30"><Plus className="size-4" /></button>
    </div>
  );
}

/** 95 -> "1h 35m", 40 -> "40 min". */
function minutesShort(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r ? `${h}h ${r}m` : `${h}h`;
}
