import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { saveDraft, loadDraft, clearDraft } from "@/lib/booking-draft";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRight, ArrowLeft, MapPin, CalendarDays, Edit3, Star,
  Users, Briefcase, Luggage, BadgeCheck, Clock, DoorOpen, UserCheck, Award,
  ShieldCheck, CreditCard, User, Mail, Phone, MessageSquare, RefreshCw,
  Shield, Package, CalendarClock, Landmark, Banknote, Sparkles,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { TrustpilotStrip } from "@/components/site/TrustpilotStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { PhoneInput } from "@/components/site/PhoneInput";

import { calculateQuotes, createBooking, type QuoteCard } from "@/lib/pricing.functions";
import { track } from "@/lib/tracking";
import { listPoisForRoute, type PoiSuggestion, type RouteTemplateSummary } from "@/lib/pois.functions";
import { calculateMultiStopQuote, type MultiStopQuoteResult } from "@/lib/scenic-quote.functions";
import { resolveTourTemplate } from "@/lib/tours.functions";
import { listPublicVehicleClasses, type PublicVehicleClass } from "@/lib/vehicle-classes.functions";
import { VehicleAllocationNotice } from "@/components/site/VehicleAllocationNotice";
import { fleetImageFor } from "@/assets/fleet";

export const Route = createFileRoute("/book")({
  // Return `q` only when it is actually present. Defaulting it to "" made the
  // router rewrite bare `/book` to `/book?q=`, so every crawl of the linked and
  // sitemapped `/book` URL answered 307 instead of 200.
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q.length > 0 ? { q: search.q } : {},
  head: () => ({
    meta: [
      { title: "Book Now — Cabslink UK Airport Transfer & Driver" },
      { name: "description", content: "Choose a vehicle and book a premium UK airport transfer with Cabslink. Instant quote, transparent pricing, 24/7 confirmation." },
      { property: "og:title", content: "Book your ride — Cabslink" },
      { property: "og:description", content: "Choose a vehicle and book a premium UK airport transfer with Cabslink. Instant quote, transparent pricing, 24/7 confirmation." },
      { property: "og:url", content: "https://cabslink.com/book" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/book" }],
  }),
  component: BookPage,
});

// -------------------------------------------------------------------
// Prefill parsing — Place-IDs are required for a real quote.
// stops encoding: `placeId::label` OR `placeId::label::minutes` (optional).
// -------------------------------------------------------------------
type PrefillStop = SelectedPlace & { minutes?: number };
type Prefill = {
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  stops: PrefillStop[];
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  ret: boolean;
  rdate: string;
  rtime: string;
  mode: "quote" | "hourly";
  templateSlug: string;
};

function decodeStops(raw: string): PrefillStop[] {
  if (!raw) return [];
  return raw.split("|").flatMap((chunk) => {
    const parts = chunk.split("::");
    const id = parts[0];
    const label = parts[1];
    const minsRaw = parts[2];
    if (!id || !label) return [];
    try {
      const stop: PrefillStop = { placeId: id, label: decodeURIComponent(label) };
      if (minsRaw !== undefined) {
        const n = Number(minsRaw);
        if (Number.isFinite(n) && n >= 0 && n <= 240) stop.minutes = Math.round(n);
      }
      return [stop];
    } catch {
      return [];
    }
  });
}

function readPrefill(q: string): Prefill {
  const p = new URLSearchParams(q);
  const pickupId = p.get("pickupPlaceId") ?? "";
  const pickupLabel = p.get("pickupLabel") ?? "";
  const dropoffId = p.get("dropoffPlaceId") ?? "";
  const dropoffLabel = p.get("dropoffLabel") ?? "";
  return {
    pickup: pickupId && pickupLabel ? { placeId: pickupId, label: pickupLabel } : null,
    dropoff: dropoffId && dropoffLabel ? { placeId: dropoffId, label: dropoffLabel } : null,
    stops: decodeStops(p.get("stops") ?? ""),
    date: p.get("date") ?? new Date().toISOString().slice(0, 10),
    time: p.get("time") ?? "12:00",
    passengers: Math.max(1, Number(p.get("passengers")) || 1),
    luggage: Math.max(0, Number(p.get("luggage")) || 0),
    ret: p.get("ret") === "1",
    rdate: p.get("rdate") ?? "",
    rtime: p.get("rtime") ?? "",
    mode: (p.get("mode") as "quote" | "hourly") ?? "quote",
    templateSlug: p.get("templateSlug") ?? "",
  };
}

function encodePrefill(pre: Prefill): string {
  const p = new URLSearchParams();
  if (pre.pickup) { p.set("pickupPlaceId", pre.pickup.placeId); p.set("pickupLabel", pre.pickup.label); }
  if (pre.dropoff) { p.set("dropoffPlaceId", pre.dropoff.placeId); p.set("dropoffLabel", pre.dropoff.label); }
  p.set("date", pre.date); p.set("time", pre.time);
  p.set("passengers", String(pre.passengers));
  p.set("luggage", String(pre.luggage));
  p.set("mode", pre.mode);
  if (pre.stops.length) {
    p.set("stops", pre.stops.map((s) => {
      const base = `${s.placeId}::${encodeURIComponent(s.label)}`;
      return s.minutes !== undefined ? `${base}::${s.minutes}` : base;
    }).join("|"));
  }
  if (pre.ret) {
    p.set("ret", "1");
    if (pre.rdate) p.set("rdate", pre.rdate);
    if (pre.rtime) p.set("rtime", pre.rtime);
  }
  if (pre.templateSlug) p.set("templateSlug", pre.templateSlug);
  return p.toString();
}


type Step = "vehicle" | "details" | "extras" | "payment" | "review";
type Policy = "non_refundable" | "standard" | "flexible";
type PaymentMethod = "card_on_confirmation" | "bank_transfer" | "pay_on_account";

type Contact = {
  customer_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  flight_number: string;
  notes: string;
};

const emptyContact: Contact = {
  customer_name: "", email: "", phone: "", whatsapp: "", flight_number: "", notes: "",
};

const contactSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  flight_number: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function BookPage() {
  const { q } = Route.useSearch();
  const pre = readPrefill(q ?? "");
  const navigate = useNavigate({ from: "/book" });
  const [step, setStep] = useState<Step>("vehicle");
  const [chosen, setChosen] = useState<QuoteCard | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [policy, setPolicy] = useState<Policy>("standard");
  const [editOpen, setEditOpen] = useState(false);
  // Extras (all consolidated on step 3)
  const [selectedStops, setSelectedStops] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    for (const s of pre.stops) if (s.minutes !== undefined) seed[s.placeId] = s.minutes;
    return seed;
  });
  const [routeMode, setRouteMode] = useState<"direct" | "scenic" | "optimised">("scenic");
  const [tourAckAt, setTourAckAt] = useState<string | null>(null);
  const [meetGreet, setMeetGreet] = useState(true);
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [returnJourney, setReturnJourney] = useState(pre.ret);
  // Contact + payment
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [payment, setPayment] = useState<PaymentMethod>("card_on_confirmation");
  const [submitting, setSubmitting] = useState(false);
  const inflight = useRef(false);
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const didHydrateRef = useRef(false);

  const hasValidRoute = !!pre.pickup?.placeId && !!pre.dropoff?.placeId
    && pre.pickup.placeId !== pre.dropoff.placeId;

  // Hydrate wizard from session-stored draft — one-shot, URL always wins.
  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    if (q) return; // Fresh URL data beats older draft.
    const d = loadDraft();
    if (!d) return;
    // Reject drafts with identical pickup/dropoff (sanitize).
    if (d.pickupPlaceId && d.dropoffPlaceId && d.pickupPlaceId === d.dropoffPlaceId) return;
    const next: Prefill = {
      pickup: d.pickupPlaceId && d.pickupLabel ? { placeId: d.pickupPlaceId, label: d.pickupLabel } : null,
      dropoff: d.dropoffPlaceId && d.dropoffLabel ? { placeId: d.dropoffPlaceId, label: d.dropoffLabel } : null,
      stops: (d.stops ?? []).flatMap((s) => (s.placeId && s.label ? [{ placeId: s.placeId, label: s.label }] : [])),
      date: d.date ?? new Date().toISOString().slice(0, 10),
      time: d.time ?? "12:00",
      passengers: d.passengers ?? 1,
      luggage: d.luggage ?? 0,
      ret: d.returnJourney?.enabled ?? false,
      rdate: d.returnJourney?.date ?? "",
      rtime: d.returnJourney?.time ?? "",
      mode: "quote",
      templateSlug: "",

    };
    if (next.pickup || next.dropoff) {
      navigate({ search: { q: encodePrefill(next) }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft (input fields only — never PII/notes/tokens/prices).
  useEffect(() => {
    saveDraft({
      pickupPlaceId: pre.pickup?.placeId,
      pickupLabel: pre.pickup?.label,
      dropoffPlaceId: pre.dropoff?.placeId,
      dropoffLabel: pre.dropoff?.label,
      stops: pre.stops.map((s) => ({ placeId: s.placeId, label: s.label })),
      date: pre.date,
      time: pre.time,
      passengers: pre.passengers,
      luggage: pre.luggage,
      vehicleSlug: chosen?.vehicleId,
      step,
      selectedStops,
      meetGreet,
      childSeatCount,
      routeMode,
      returnJourney: { enabled: returnJourney, date: pre.rdate, time: pre.rtime },
    });
  }, [q, chosen?.vehicleId, step, selectedStops, meetGreet, childSeatCount, routeMode, returnJourney, pre.date, pre.time, pre.passengers, pre.luggage, pre.pickup?.placeId, pre.dropoff?.placeId, pre.rdate, pre.rtime, pre.pickup?.label, pre.dropoff?.label, pre.stops]);

  const startAgain = () => {
    clearDraft();
    setChosen(null);
    setStep("vehicle");
    setSelectedStops({});
    setMeetGreet(true);
    setChildSeatCount(0);
    setRouteMode("scenic");
    setReturnJourney(false);
    setContact(emptyContact);
    navigate({ search: { q: "" }, replace: true });
  };

  const applyEdit = (next: Prefill) => {
    setChosen(null);
    setStep("vehicle");
    navigate({ search: { q: encodePrefill(next) }, replace: true });
    setEditOpen(false);
  };



  const quoteFn = useServerFn(calculateQuotes);
  const quoteQuery = useQuery({
    enabled: hasValidRoute,
    queryKey: [
      "quotes",
      pre.pickup?.placeId, pre.dropoff?.placeId,
      pre.passengers, pre.luggage, pre.time,
      pre.stops.map((s) => s.placeId).join(","),
    ],
    queryFn: () =>
      quoteFn({
        data: {
          pickupPlaceId: pre.pickup!.placeId,
          pickupLabel: pre.pickup!.label,
          destinationPlaceId: pre.dropoff!.placeId,
          destinationLabel: pre.dropoff!.label,
          stops: pre.stops,
          pickupDate: pre.date,
          pickupTime: pre.time,
          passengers: pre.passengers,
          luggage: pre.luggage,
        },
      }),
  });

  const poisFn = useServerFn(listPoisForRoute);
  const poisQuery = useQuery({
    enabled: hasValidRoute && !!quoteQuery.data,
    queryKey: ["pois", pre.pickup?.placeId, pre.dropoff?.placeId],
    staleTime: 10 * 60 * 1000,
    queryFn: () =>
      poisFn({
        data: {
          pickup_place_id: pre.pickup!.placeId,
          destination_place_id: pre.dropoff!.placeId,
        },
      }),
  });

  const resolveTemplateFn = useServerFn(resolveTourTemplate);
  const templateQuery = useQuery({
    enabled: !!pre.templateSlug,
    queryKey: ["tour-template", pre.templateSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: () => resolveTemplateFn({ data: { slug: pre.templateSlug } }),
  });
  const tourTemplate = templateQuery.data ?? null;
  const templateMismatch = !!pre.templateSlug && !!tourTemplate && hasValidRoute && (
    tourTemplate.pickup.place_id !== pre.pickup?.placeId
    || tourTemplate.dropoff.place_id !== pre.dropoff?.placeId
  );
  const templateMissing = !!pre.templateSlug && templateQuery.isFetched && !tourTemplate;

  const orderedSelected = (poisQuery.data?.pois ?? [])
    .filter((p) => selectedStops[p.place_id] !== undefined)
    .map((p) => ({
      place_id: p.place_id,
      label: p.name,
      minutes: selectedStops[p.place_id],
      category: p.category,
    }));

  const multiStopFn = useServerFn(calculateMultiStopQuote);
  const multiStopQuery = useQuery({
    enabled: hasValidRoute && orderedSelected.length > 0,
    queryKey: [
      "multi-stop-quote",
      pre.pickup?.placeId, pre.dropoff?.placeId, routeMode,
      orderedSelected.map((s) => `${s.place_id}:${s.minutes}`).join("|"),
    ],
    queryFn: () =>
      multiStopFn({
        data: {
          pickup_place_id: pre.pickup!.placeId,
          pickup_label: pre.pickup!.label,
          destination_place_id: pre.dropoff!.placeId,
          destination_label: pre.dropoff!.label,
          pickup_time: pre.time,
          stops: orderedSelected,
          route_mode: routeMode,
        },
      }),
  });

  const toggleStop = (poi: PoiSuggestion) => {
    setSelectedStops((prev) => {
      const next = { ...prev };
      if (next[poi.place_id] !== undefined) delete next[poi.place_id];
      else next[poi.place_id] = poi.recommended_visit_minutes;
      return next;
    });
    setTourAckAt(null);
  };
  const setStopMinutes = (placeId: string, minutes: number) => {
    setSelectedStops((prev) => ({ ...prev, [placeId]: minutes }));
    setTourAckAt(null);
  };
  const changeRouteMode = (mode: "direct" | "scenic" | "optimised") => {
    setRouteMode(mode);
    setTourAckAt(null);
  };

  const mq = multiStopQuery.data ?? null;
  const isConverted = !!mq && mq.service_type !== mq.original_service_type;
  const needsAck = isConverted && !tourAckAt;

  // ---- Pricing math (single source used by extras/payment/review) ----
  const childSeatFeePence = quoteQuery.data?.childSeatFeePence ?? 0;
  const meetGreetFeePence = quoteQuery.data?.meetGreetFeePence ?? 0;
  const returnJourneyFeePence = quoteQuery.data?.returnJourneyFeePence ?? 0;
  const policyCfg = quoteQuery.data?.policy ?? {
    nonRefundablePercent: 5, nonRefundableMinPence: 200,
    flexiblePercent: 12, flexibleMinPence: 400,
  };
  const seatFee = (childSeatFeePence / 100) * childSeatCount;
  const meetGreetFee = meetGreet ? meetGreetFeePence / 100 : 0;
  const returnFee = returnJourney ? returnJourneyFeePence / 100 : 0;
  const perVehiclePrice = chosen
    ? (mq?.vehicles.find((v) => v.vehicle_id === chosen.vehicleId)?.per_vehicle_total ?? chosen.finalPrice)
    : 0;
  const rideTotal = perVehiclePrice * qty;
  const extrasBase = rideTotal + seatFee + meetGreetFee + returnFee;
  const policyDelta =
    policy === "non_refundable"
      ? -Math.max(policyCfg.nonRefundableMinPence / 100, Math.round(extrasBase * (policyCfg.nonRefundablePercent / 100) * 100) / 100)
      : policy === "flexible"
      ? Math.max(policyCfg.flexibleMinPence / 100, Math.round(extrasBase * (policyCfg.flexiblePercent / 100) * 100) / 100)
      : 0;
  const grandTotal = Math.max(0, extrasBase + policyDelta);

  const bookFn = useServerFn(createBooking);
  const submitBooking = async () => {
    if (inflight.current || !chosen) return;
    if (!pre.pickup || !pre.dropoff) { toast.error("Journey is missing pickup or destination."); return; }
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) { toast.error("Missing contact details."); setStep("details"); return; }
    inflight.current = true;
    setSubmitting(true);
    try {
      const mergedStops = orderedSelected.length > 0
        ? orderedSelected.map((s) => ({ placeId: s.place_id, label: s.label, minutes: s.minutes, category: s.category ?? null }))
        : pre.stops.map((s) => ({ placeId: s.placeId, label: s.label, minutes: 0 }));
      const paymentLabel =
        payment === "card_on_confirmation" ? "Card (details shared on confirmation)"
        : payment === "bank_transfer" ? "Bank transfer"
        : "Pay on account";
      const policyLabel = policy === "non_refundable" ? "Non-refundable" : policy === "flexible" ? "Flexible" : "Standard";
      const res = await bookFn({
        data: {
          idempotencyKey: idempotencyKey.current,
          vehicleId: chosen.vehicleId,
          vehicleCount: qty,
          pickupPlaceId: pre.pickup.placeId,
          pickupLabel: pre.pickup.label,
          destinationPlaceId: pre.dropoff.placeId,
          destinationLabel: pre.dropoff.label,
          stops: mergedStops,
          routeMode: orderedSelected.length > 0 ? routeMode : undefined,
          stopsFingerprint: mq?.stops_fingerprint ?? undefined,
          tourConversionAckAt: tourAckAt ?? undefined,
          pickupDate: pre.date,
          pickupTime: pre.time,
          passengers: pre.passengers,
          luggage: pre.luggage,
          customer_name: parsed.data.customer_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          flight_number: parsed.data.flight_number || null,
          notes: (() => {
            const parts: string[] = [];
            parts.push(`Cancellation policy: ${policyLabel}`);
            parts.push(`Payment method: ${paymentLabel}`);
            if (parsed.data.whatsapp) parts.push(`WhatsApp: ${parsed.data.whatsapp}`);
            if (childSeatCount > 0) parts.push(`Child seats requested: ${childSeatCount}`);
            if (parsed.data.notes) parts.push(parsed.data.notes);
            return parts.join("\n");
          })(),
          child_seat: childSeatCount > 0,
          child_seat_count: childSeatCount,
          meet_greet: meetGreet,
          return_journey: returnJourney,
          cancellation_policy: policy,
          templateSlug: pre.templateSlug || null,
        },
      });
      track("booking_submitted", {
        vehicle: chosen.vehicleId,
        vehicle_count: qty,
        value: grandTotal / 100,
        currency: "GBP",
        stops: mergedStops.length,
        payment_method: payment,
        cancellation_policy: policy,
      });
      toast.success("Booking request received.");
      idempotencyKey.current = crypto.randomUUID();
      clearDraft();
      const token = (res as any)?.token ?? null;
      if (token) navigate({ to: "/booking/$token", params: { token } });
      else setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save booking. Try again or call us.");
    } finally {
      setSubmitting(false);
      inflight.current = false;
    }
  };

  return (
    <SiteLayout>
      <section className="relative bg-[var(--surface)] py-10 md:py-14 min-h-[80vh] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden>
          <div className="absolute -top-24 -left-24 size-96 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-[var(--navy)]/5 blur-3xl" />
        </div>

        <div className="container-x relative">
          {!hasValidRoute ? (
            <JourneyForm initial={pre} onSubmit={applyEdit} />

          ) : (
            <>
              {pre.templateSlug && (
                <TourBanner
                  slug={pre.templateSlug}
                  name={tourTemplate?.name ?? null}
                  loading={templateQuery.isLoading}
                  missing={templateMissing}
                  mismatch={templateMismatch}
                  onStartAgain={startAgain}
                />
              )}
              <Stepper step={step} />
              <div className="mt-8 grid lg:grid-cols-[340px_1fr] gap-6 items-start pb-24 lg:pb-0">
                <Sidebar
                  pre={pre}
                  onEdit={() => setEditOpen(true)}
                  onStartAgain={startAgain}
                  route={quoteQuery.data ? { miles: quoteQuery.data.distanceMiles, minutes: quoteQuery.data.durationMinutes } : null}
                  price={chosen ? { vehicleName: chosen.name, perVehicle: perVehiclePrice, qty, rideTotal, seatFee, seatCount: childSeatCount, meetGreetFee, returnFee, policy, policyDelta, grandTotal } : null}
                />

                <div className="min-w-0 space-y-6">
                  {step === "vehicle" && (
                    <VehicleStep
                      pre={pre}
                      data={quoteQuery.data}
                      isLoading={quoteQuery.isLoading}
                      error={quoteQuery.error as Error | null}
                      onRetry={() => quoteQuery.refetch()}
                      onSelect={(card, quantity) => { setChosen(card); setQty(quantity); track("booking_step", { step: "details", vehicle: card.vehicleId, vehicle_count: quantity }); setStep("details"); }}
                    />
                  )}

                  {step === "details" && chosen && (
                    <ContactStep
                      contact={contact}
                      onChange={setContact}
                      onBack={() => setStep("vehicle")}
                      onNext={() => {
                        const parsed = contactSchema.safeParse(contact);
                        if (!parsed.success) { toast.error("Please fill name, email and phone."); return; }
                        setStep("extras");
                      }}
                    />
                  )}

                  {step === "extras" && chosen && (
                    <ExtrasStep
                      pois={poisQuery.data?.pois ?? []}
                      template={poisQuery.data?.template ?? null}
                      poisLoading={poisQuery.isLoading}
                      selectedStops={selectedStops}
                      onToggleStop={toggleStop}
                      onStopMinutes={setStopMinutes}
                      routeMode={routeMode}
                      onRouteModeChange={changeRouteMode}
                      multiQuote={mq}
                      multiLoading={multiStopQuery.isFetching}
                      multiError={multiStopQuery.error as Error | null}
                      converted={isConverted}
                      needsAck={needsAck}
                      onAck={() => setTourAckAt(new Date().toISOString())}
                      childSeatFeePence={childSeatFeePence}
                      childSeatCount={childSeatCount}
                      onChildSeatCount={setChildSeatCount}
                      meetGreet={meetGreet}
                      onMeetGreet={setMeetGreet}
                      returnJourney={returnJourney}
                      onReturnJourney={setReturnJourney}
                      policy={policy}
                      onPolicy={setPolicy}
                      baseRideTotal={rideTotal}
                      seatFee={seatFee}
                      meetGreetFee={meetGreetFee}
                      returnFee={returnFee}
                      meetGreetFeePence={meetGreetFeePence}
                      returnJourneyFeePence={returnJourneyFeePence}
                      policyCfg={policyCfg}
                      onBack={() => setStep("details")}
                      onNext={() => { track("booking_step", { step: "payment", value: grandTotal / 100, currency: "GBP" }); setStep("payment"); }}
                    />
                  )}

                  {step === "payment" && chosen && (
                    <PaymentStep
                      value={payment}
                      onChange={setPayment}
                      grandTotal={grandTotal}
                      onBack={() => setStep("extras")}
                      onSubmit={submitBooking}
                      submitting={submitting}
                    />
                  )}

                  {step === "review" && chosen && (
                    <AlreadySubmittedStep card={chosen} qty={qty} onBack={() => setStep("payment")} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      {chosen && step !== "review" && (
        <MobilePriceBar price={{ vehicleName: chosen.name, perVehicle: perVehiclePrice, qty, rideTotal, seatFee, seatCount: childSeatCount, meetGreetFee, returnFee, policy, policyDelta, grandTotal }} />
      )}
      <EditTripDialog open={editOpen} onOpenChange={setEditOpen} initial={pre} onSave={applyEdit} />
    </SiteLayout>
  );
}


function JourneyForm({ initial, onSubmit }: { initial: Prefill; onSubmit: (next: Prefill) => void }) {
  const [form, setForm] = useState<Prefill>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Prefill>(k: K, v: Prefill[K]) => setForm((f) => ({ ...f, [k]: v }));

  const sameSpot = !!form.pickup?.placeId && form.pickup.placeId === form.dropoff?.placeId;
  const canSubmit = !!form.pickup?.placeId && !!form.dropoff?.placeId && !sameSpot && !!form.date && !!form.time;

  return (
    <form
      data-testid="book-journey-form"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (canSubmit) onSubmit(form);
      }}
      className="max-w-2xl mx-auto mt-6 md:mt-10 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-raised"
    >
      <div className="flex items-center gap-3">
        <span className="grid place-items-center size-10 rounded-full bg-[var(--gold)]/15 text-[var(--gold-ink)]">
          <MapPin className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold leading-tight">Your journey details</h1>
          <p className="text-sm text-muted-foreground">Fill this in and we'll show your instant quote.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="jf-pickup">Pickup</Label>
          <PlaceAutocomplete id="jf-pickup" value={form.pickup} onChange={(v) => set("pickup", v)}
            placeholder="Enter UK airport, postcode or address" iconClassName="left-3" inputClassName="pl-9" />
          {touched && !form.pickup?.placeId && (
            <p className="text-xs text-destructive">Choose a pickup location from the suggestions.</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="jf-dropoff">Destination</Label>
          <PlaceAutocomplete id="jf-dropoff" value={form.dropoff} onChange={(v) => set("dropoff", v)}
            placeholder="Enter UK destination" iconClassName="left-3" inputClassName="pl-9" />
          {touched && !form.dropoff?.placeId && (
            <p className="text-xs text-destructive">Choose a destination from the suggestions.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="jf-date">Date</Label>
            <Input id="jf-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            {touched && !form.date && <p className="text-xs text-destructive">Pick a date.</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="jf-time">Time</Label>
            <Input id="jf-time" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            {touched && !form.time && <p className="text-xs text-destructive">Pick a time.</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="jf-pax">Passengers</Label>
            <Input id="jf-pax" type="number" min={1} max={60} value={form.passengers}
              onChange={(e) => set("passengers", Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="jf-lug">Luggage</Label>
            <Input id="jf-lug" type="number" min={0} max={60} value={form.luggage}
              onChange={(e) => set("luggage", Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
        {sameSpot && (
          <p className="text-xs text-destructive">Pickup and destination cannot be the same location.</p>
        )}
      </div>

      <Button type="submit" variant="gold" className="mt-6 w-full rounded-full h-12 text-base">
        Continue to vehicles
      </Button>
    </form>
  );
}


function EditTripDialog({
  open, onOpenChange, initial, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Prefill;
  onSave: (next: Prefill) => void;
}) {
  const [form, setForm] = useState<Prefill>(initial);
  useMemo(() => { if (open) setForm(initial); }, [open, initial]);
  const set = <K extends keyof Prefill>(k: K, v: Prefill[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canSave =
    !!form.pickup?.placeId && !!form.dropoff?.placeId
    && form.pickup.placeId !== form.dropoff.placeId
    && !!form.date && !!form.time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit your trip</DialogTitle>
          <DialogDescription>Update pickup, dropoff, date, time or passengers and we'll refresh your quote.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-pickup">Pickup</Label>
            <PlaceAutocomplete id="edit-pickup" value={form.pickup} onChange={(v) => set("pickup", v)}
              placeholder="Enter UK airport, postcode or address" iconClassName="left-3" inputClassName="pl-9" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-dropoff">Dropoff</Label>
            <PlaceAutocomplete id="edit-dropoff" value={form.dropoff} onChange={(v) => set("dropoff", v)}
              placeholder="Enter UK destination" iconClassName="left-3" inputClassName="pl-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-time">Time</Label>
              <Input id="edit-time" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-pax">Passengers</Label>
              <Input id="edit-pax" type="number" min={1} max={60} value={form.passengers}
                onChange={(e) => set("passengers", Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-lug">Luggage</Label>
              <Input id="edit-lug" type="number" min={0} max={60} value={form.luggage}
                onChange={(e) => set("luggage", Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          {form.pickup && form.dropoff && form.pickup.placeId === form.dropoff.placeId && (
            <p className="text-xs text-destructive">Pickup and destination cannot be the same location.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!canSave}>Update quote</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: "vehicle", label: "Vehicle" },
    { id: "details", label: "Details" },
    { id: "extras", label: "Extras" },
    { id: "payment", label: "Payment" },
    { id: "review", label: "Done" },
  ];

  const idx = items.findIndex((x) => x.id === step);
  const current = items[Math.max(0, idx)];
  return (
    <>
      {/* Mobile: compact current-step + dots */}
      <div className="md:hidden flex items-center justify-between gap-3 rounded-full bg-card border border-border px-4 py-2.5 shadow-sm">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">
            Step 0{Math.max(1, idx + 1)}/5
          </span>
          <span className="text-sm font-bold text-foreground truncate">{current?.label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden>
          {items.map((it, i) => (
            <span
              key={it.id}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-[var(--gold)]" : i < idx ? "w-1.5 bg-[var(--navy)]" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
      {/* md+: full pill stepper */}
      <div className="hidden md:flex items-center justify-center gap-3 md:gap-4 flex-wrap">
        {items.map((it, i) => {
          const active = i === idx;
          const done = i < idx;
          return (
            <div key={it.id} className="flex items-center gap-3">
              <div className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
                active ? "bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]"
                : done ? "bg-[var(--navy)] text-[var(--gold)]"
                : "bg-card text-foreground/55 border border-border"
              }`}>{`0${i + 1}`} · {it.label}</div>
              {i < items.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          );
        })}
      </div>
    </>
  );
}

type PriceSummary = {
  vehicleName: string;
  perVehicle: number;
  qty: number;
  rideTotal: number;
  seatFee: number;
  seatCount: number;
  meetGreetFee: number;
  returnFee: number;
  policy: Policy;
  policyDelta: number;
  grandTotal: number;
};

function fmtGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function PriceBreakdown({ price }: { price: PriceSummary }) {
  const policyLabel = price.policy === "non_refundable" ? "Non-refundable" : price.policy === "flexible" ? "Flexible" : "Standard";
  const parts = [
    `Ride ${fmtGBP(price.rideTotal)}`,
    ...(price.seatCount > 0 ? [`Child seats ${fmtGBP(price.seatFee)}`] : []),
    ...(price.meetGreetFee > 0 ? [`Meet & greet ${fmtGBP(price.meetGreetFee)}`] : []),
    ...(price.returnFee > 0 ? [`Return ${fmtGBP(price.returnFee)}`] : []),
    `Cancellation cover: ${policyLabel}`,
  ];
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)] mb-3">Running Total</p>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground leading-snug">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && <span className="mx-1.5 text-border">·</span>}
            </span>
          ))}
        </p>
        <span className="shrink-0 font-display text-3xl font-bold text-[var(--gold-ink)] tabular-nums leading-none">
          {fmtGBP(price.grandTotal)}
        </span>
      </div>
    </div>
  );
}

function MobilePriceBar({ price }: { price: PriceSummary }) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(14,24,44,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total incl. VAT</p>
          <p className="font-display text-xl font-bold text-foreground tabular-nums leading-tight">{fmtGBP(price.grandTotal)}</p>
        </div>
        <a
          href="#step-actions"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-5 py-2.5 text-sm font-bold shadow-[var(--shadow-glow)]"
        >
          Continue <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}

function TourBanner({ slug, name, loading, missing, mismatch, onStartAgain }: {
  slug: string;
  name: string | null;
  loading: boolean;
  missing: boolean;
  mismatch: boolean;
  onStartAgain: () => void;
}) {
  const tone = missing || mismatch
    ? "border-warning/60 bg-warning/12 text-warning"
    : "border-[var(--gold)]/40 bg-[var(--gold)]/8 text-foreground";
  return (
    <div className={`rounded-2xl border ${tone} px-4 py-3 flex items-start gap-3`}>
      <Sparkles className="size-4 mt-0.5 text-[var(--gold-ink)] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Loading tour details…</p>
        ) : missing ? (
          <p><strong>This tour is no longer available.</strong> Start again to pick another tour or book a direct transfer.</p>
        ) : mismatch ? (
          <p><strong>Pickup or drop-off no longer matches the "{name}" tour.</strong> Return to the tour page to keep tour pricing.</p>
        ) : (
          <p>
            You're customising the <strong>{name ?? "selected"}</strong> tour.{" "}
            <Link to="/tours/$slug" params={{ slug }} className="underline underline-offset-2 hover:text-[var(--gold-ink)]">View tour details</Link>.
          </p>
        )}
      </div>
      {(missing || mismatch) && (
        <button onClick={onStartAgain} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-current hover:bg-white/40 transition shrink-0">
          Start again
        </button>
      )}
    </div>
  );
}

function Sidebar({ pre, onEdit, onStartAgain, route, price }: {
  pre: Prefill; onEdit: () => void; onStartAgain?: () => void;
  route: { miles: number; minutes: number } | null;
  price: PriceSummary | null;

}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <details className="group relative bg-card rounded-2xl border border-border shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)] overflow-hidden lg:!open" open>
        <summary className="lg:hidden list-none cursor-pointer select-none flex items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex items-center gap-2">
            <MapPin className="size-4 text-[var(--gold-ink)] shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              {pre.pickup?.label || "Pickup"} → {pre.dropoff?.label || "Dropoff"}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gold-ink)] group-open:hidden shrink-0">View</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden group-open:inline shrink-0">Hide</span>
        </summary>
        <div className="p-5 lg:p-6 pt-0 lg:pt-6">
          <div className="absolute -top-16 -right-16 size-40 rounded-full bg-[var(--gold)]/10 blur-2xl pointer-events-none" aria-hidden />
          <div className="relative flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Your Journey</p>
              <h3 className="font-display font-bold text-lg text-foreground mt-0.5">Trip Summary</h3>
            </div>
            <div className="flex items-center gap-2">
              {onStartAgain && (
                <button onClick={onStartAgain} className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-[var(--gold-ink)] hover:border-[var(--gold)]/40 transition" title="Clear saved draft and start over">
                  Start again
                </button>
              )}
              <button onClick={onEdit} className="size-8 rounded-full border border-border text-muted-foreground hover:text-[var(--gold-ink)] hover:border-[var(--gold)]/40 flex items-center justify-center transition" aria-label="Edit trip">
                <Edit3 className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-[9px] top-3 bottom-3 border-l-2 border-dashed border-[var(--gold)]/40" />
            <div className="relative">
              <div className="absolute -left-6 top-1.5 size-4 rounded-full bg-[var(--gold)] ring-4 ring-[var(--gold)]/20" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
              <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">{pre.pickup?.label || "—"}</p>
            </div>
            <div className="relative mt-6">
              <div className="absolute -left-6 top-1.5 size-4 rounded-full border-2 border-[var(--gold)] bg-card" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Dropoff</p>
              <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">{pre.dropoff?.label || "—"}</p>
            </div>
          </div>

          {route && (
            <div className="relative mt-5 grid grid-cols-2 gap-2">
              <div className="bg-[var(--surface)] rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-[var(--gold-ink)]">
                  <MapPin className="size-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Distance</span>
                </div>
                <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums leading-none">
                  {route.miles.toFixed(1)}<span className="text-xs font-semibold text-muted-foreground ml-1">mi</span>
                </p>
              </div>
              <div className="bg-[var(--surface)] rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-[var(--gold-ink)]">
                  <Clock className="size-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Duration</span>
                </div>
                <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums leading-none">
                  {route.minutes}<span className="text-xs font-semibold text-muted-foreground ml-1">min</span>
                </p>
              </div>
            </div>
          )}

          <div className="relative mt-5 pt-4 border-t border-border grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="size-3 text-[var(--gold-ink)]" /> Date
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{pre.date || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3 text-[var(--gold-ink)]" /> Time
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{pre.time || "—"}</p>
            </div>
          </div>
        </div>
      </details>

      {price && <div className="hidden lg:block"><PriceBreakdown price={price} /></div>}

      {/* Independent rating, shown where the decision is actually made. */}
      <TrustpilotStrip className="hidden lg:block" />

      <div className="hidden lg:block bg-card rounded-2xl border border-border p-5 shadow-sm space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)] mb-1">Why Cabslink</p>
        {[
          // No passenger-volume claim here — we have no verified figure to cite.
          "Licensed and insured UK operator",
          "Team confirms availability quickly",
          "All-inclusive fixed pricing",
          "Pay by card or on account after we confirm",
        ].map((t) => (
          <div key={t} className="flex gap-2 text-sm">
            <CheckCircle2 className="size-4 text-[var(--gold-ink)] mt-0.5 shrink-0" />
            <span className="text-foreground/80">{t}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}


function TourConversionBanner({ from, to, reason, acked, onAck }: {
  from: string; to: string; reason: string; acked: boolean; onAck: () => void;
}) {
  const pretty = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className={`rounded-2xl border p-5 md:p-6 ${acked ? "border-success/40 bg-success/5" : "border-[var(--gold)]/60 bg-[var(--gold)]/10"}`}>
      <div className="flex items-start gap-3">
        <BadgeCheck className={`size-5 shrink-0 mt-0.5 ${acked ? "text-success" : "text-[var(--gold-ink)]"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">Service change</p>
          <h4 className="font-display font-bold text-base md:text-lg mt-1">
            Your journey now qualifies as a <span className="underline decoration-[var(--gold)]">{pretty(to)}</span>
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Originally quoted as {pretty(from)}. {reason}
          </p>
          <div className="mt-4">
            {acked ? (
              <p className="text-xs text-success font-semibold">✓ Change acknowledged — you can now continue.</p>
            ) : (
              <Button size="sm" variant="gold" className="rounded-full" onClick={onAck}>
                I understand — continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleStep({ pre, data, isLoading, error, onRetry, onSelect }: {
  pre: Prefill;
  data: Awaited<ReturnType<typeof calculateQuotes>> | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onSelect: (card: QuoteCard, qty: number) => void;
}) {
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const minQtyFor = (v: { passengers: number; luggage: number }) => {
    const paxNeed = Math.max(1, pre.passengers);
    const lugNeed = Math.max(0, pre.luggage);
    const paxQty = v.passengers > 0 ? Math.ceil(paxNeed / v.passengers) : 1;
    const lugQty = v.luggage > 0 ? Math.ceil(lugNeed / v.luggage) : (lugNeed > 0 ? 99 : 1);
    return Math.max(1, paxQty, lugQty);
  };

  const orderedQuotes = useMemo(() => {
    if (!data?.quotes) return [];
    return [...data.quotes].sort((a, b) => {
      const aFits = minQtyFor(a) <= 1 ? 0 : 1;
      const bFits = minQtyFor(b) <= 1 ? 0 : 1;
      if (aFits !== bFits) return aFits - bFits;
      return a.finalPrice - b.finalPrice;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.quotes, pre.passengers, pre.luggage]);

  const { data: vehicleClasses = [], isLoading: vehicleClassesLoading } = useQuery({
    queryKey: ["public-vehicle-classes"],
    queryFn: () => listPublicVehicleClasses(),
    staleTime: 60_000,
  });
  const classByVehicleId = useMemo(() => {
    const m = new Map<string, PublicVehicleClass>();
    for (const c of vehicleClasses) if (c.pricing_vehicle_id) m.set(c.pricing_vehicle_id, c);
    return m;
  }, [vehicleClasses]);
  const visibleQuotes = vehicleClassesLoading
    ? []
    : orderedQuotes.filter((q) => q.classId ? vehicleClasses.some((c) => c.id === q.classId) : classByVehicleId.has(q.vehicleId));

  return (
    <div>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Step 01 — Choose Your Class</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
            Select a vehicle class · {pre.ret ? "Return" : "One Way"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            You're booking a vehicle class — the exact model is allocated by our dispatch team on the day.
          </p>
        </div>
        {data && (
          <div className="inline-flex items-center gap-2 bg-[var(--navy)] text-[var(--navy-foreground)] rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest">
            <BadgeCheck className="size-3.5 text-[var(--gold-ink)]" />
             {visibleQuotes.length} classes available
          </div>
        )}
      </div>

      <VehicleAllocationNotice className="mb-6" compact />

      <div className="space-y-6">
        {(isLoading || vehicleClassesLoading) && (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground text-sm">Calculating quotes…</div>
        )}
        {error && (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-sm space-y-3">
            <p className="text-destructive">{(error as Error).message}</p>
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="size-4 mr-1.5" /> Retry
            </Button>
          </div>
        )}
        {data && !vehicleClassesLoading && visibleQuotes.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
            No vehicle classes are currently available.
          </div>
        )}
        {visibleQuotes.map((q, i) => {
          const minQty = minQtyFor(q);
          const qty = qtyMap[q.vehicleId] ?? minQty;
          const capacityShort = qty < minQty;
          const reason = capacityShort
            ? `This class seats ${q.passengers} passengers and ${q.luggage} luggage. Select at least ${minQty} vehicles to fit ${pre.passengers} passenger${pre.passengers === 1 ? "" : "s"}${pre.luggage ? ` and ${pre.luggage} bag${pre.luggage === 1 ? "" : "s"}` : ""}.`
            : null;
          const klass = classByVehicleId.get(q.vehicleId);
          return (
            <VehicleCard key={q.vehicleId} card={q} klass={klass} best={i === 0 && minQtyFor(q) <= 1} qty={qty}
              minQty={minQty}
              disabled={capacityShort}
              disabledReason={reason}
              onQtyChange={(n) => setQtyMap((m) => ({ ...m, [q.vehicleId]: n }))}
              onSelect={() => { if (!capacityShort) onSelect(klass ? { ...q, name: klass.name } : q, qty); }} />
          );
        })}
      </div>
    </div>
  );
}



function isQuoteOnRequest(name: string): boolean {
  return /coaster|coach\s*bus|24-?seater|55-?seater/i.test(name);
}

function VehicleCard({ card, klass, best, qty, minQty, disabled, disabledReason, onQtyChange, onSelect }: {
  card: QuoteCard; klass?: PublicVehicleClass; best: boolean; qty: number; minQty: number;
  disabled?: boolean; disabledReason?: string | null;
  onQtyChange: (n: number) => void; onSelect: () => void;
}) {
  const total = card.finalPrice * qty;
  const serial = card.vehicleId.slice(0, 8).toUpperCase();
  const quoteOnly = klass?.quote_on_request ?? card.quoteOnRequest ?? isQuoteOnRequest(card.name);
  const displayName = klass?.name ?? card.name;
  const displayImage = (klass ? fleetImageFor(klass.slug, klass.hero_image) : undefined) ?? card.imageUrl;
  return (
    <div className={`relative flex flex-col md:flex-row bg-card rounded-2xl shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)] border transition-all duration-500 hover:shadow-[0_20px_60px_-20px_rgba(223,175,38,0.35)] ${best ? "border-[var(--gold)]/60" : minQty > 1 ? "border-warning/50" : "border-border"}`}>
      {best && (
        <div className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-md shadow-md">
          <Award className="size-3" /> Best Value
        </div>
      )}
      {!best && minQty > 1 && (
        <div className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 bg-warning text-warning-foreground text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-md shadow-md">
          Needs {minQty} vehicles
        </div>
      )}

      <div className="flex-1 min-w-0 p-5 md:p-6 flex flex-col md:flex-row gap-5 md:gap-6">
        <div className="w-full md:w-44 lg:w-48 flex-shrink-0 flex items-center justify-center bg-[var(--surface)] rounded-xl p-3">
          <img src={displayImage} alt={displayName} className="w-full aspect-[3/2] object-contain" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">
                  <BadgeCheck className="size-3" /> Vehicle Class
                </span>
                <h3 className="mt-1.5 font-display text-lg md:text-xl font-bold uppercase tracking-tight text-foreground leading-tight break-words">
                  {displayName}
                </h3>
                {klass?.short_description && (
                  <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{klass.short_description}</p>
                )}
                {klass && klass.models.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mr-1 self-center">Includes:</span>
                    {klass.models.slice(0, 4).map((m) => (
                      <span key={m.id} className="rounded-full bg-[var(--navy)]/5 text-[var(--navy)]/80 px-2 py-0.5 text-[10.5px] font-medium">
                        {m.name}
                      </span>
                    ))}
                    {klass.models.length > 4 && (
                      <span className="text-[10.5px] text-muted-foreground self-center">+{klass.models.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 text-[var(--gold-ink)] shrink-0 pt-1">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} className="size-3 fill-current" />))}
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              <Feature icon={<Users className="size-3.5" />}>{card.passengers * qty} Passengers</Feature>
              <Feature icon={<Briefcase className="size-3.5" />}>{card.luggage * qty} Luggage</Feature>
              <Feature icon={<Luggage className="size-3.5" />}>{card.handLuggage * qty} Hand Bag</Feature>
              <Feature icon={<BadgeCheck className="size-3.5" />}>Meet &amp; Greet</Feature>
              <Feature icon={<Clock className="size-3.5" />}>Free Waiting</Feature>
              <Feature icon={<DoorOpen className="size-3.5" />}>Door to Door</Feature>
              <Feature icon={<UserCheck className="size-3.5" />}>Pro Driver</Feature>
            </ul>
          </div>
          {minQty > 1 && (
            <div className="mt-4 rounded-lg border border-warning/50 bg-warning/12 px-3 py-2 text-[12px] text-warning leading-snug">
              This vehicle fits {card.passengers} passenger{card.passengers === 1 ? "" : "s"} &amp; {card.luggage} bag{card.luggage === 1 ? "" : "s"}. You&apos;ll need <span className="font-bold">{minQty} vehicles</span> for your party — set the quantity below to continue.
            </div>
          )}
          <p className="mt-5 text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground/70">
            No. {serial} · Cabslink Pass
          </p>
        </div>
      </div>

      <div className="relative hidden md:flex flex-col items-center justify-center px-1">
        <div className="absolute -top-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
        <div className="h-[calc(100%-2rem)] w-px border-l-2 border-dashed border-[var(--gold)]/40"></div>
        <div className="absolute -bottom-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
      </div>
      <div className="relative md:hidden flex items-center justify-center py-1">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
        <div className="w-[calc(100%-2rem)] h-px border-t-2 border-dashed border-[var(--gold)]/40"></div>
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
      </div>

      <div className="w-full md:w-60 lg:w-64 shrink-0 bg-gradient-to-br from-[var(--gold)]/10 via-[var(--surface)] to-[var(--gold)]/5 md:rounded-r-2xl rounded-b-2xl md:rounded-b-none p-5 md:p-6 flex flex-col justify-between items-center text-center">
        {quoteOnly ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">Group Vehicle</p>
            <p className="mt-2 font-display text-xl md:text-2xl font-bold text-[var(--gold-ink)] leading-tight">Quote on request</p>
            <p className="mt-2 text-[12px] text-muted-foreground leading-snug">
               Pricing for {displayName.toLowerCase().includes("coach") ? "coach" : "coaster"} bookings depends on route, timings and availability. Contact us and we'll confirm the fare and reserve this vehicle for you.
            </p>
            <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3 text-[var(--gold-ink)]" /> No obligation quote</p>
              <p className="flex items-center justify-center gap-1.5"><Clock className="size-3 text-[var(--gold-ink)]" /> Fast response, 24/7</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">From</p>
            <div className="mt-2 flex items-baseline justify-center gap-0.5 text-foreground">
              <span className="text-lg font-display font-bold text-[var(--gold-ink)]">£</span>
              <span className="text-3xl md:text-4xl font-display font-bold tabular-nums tracking-tight">{total.toFixed(2)}</span>
            </div>
            {qty > 1 && (<p className="text-[11px] text-muted-foreground mt-1">{qty} × £{card.finalPrice.toFixed(2)}</p>)}
            <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3 text-[var(--gold-ink)]" /> No hidden cost</p>
              <p className="flex items-center justify-center gap-1.5"><Clock className="size-3 text-[var(--gold-ink)]" /> Free cancellation option</p>
            </div>
          </div>
        )}

        <div className="w-full mt-5 space-y-3">
          {!quoteOnly && (
            <div className="w-full">
              <Label className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                Vehicles{minQty > 1 ? ` · min ${minQty}` : ""}
              </Label>
              <Select value={String(qty)} onValueChange={(v) => onQtyChange(Number(v))}>
                <SelectTrigger className={`mt-1 h-10 bg-card ${qty < minQty ? "border-warning" : "border-[var(--gold)]/50"}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} × Vehicle{n < minQty ? " — not enough" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {quoteOnly ? (
            <Button asChild variant="navy" className="w-full h-12 rounded-lg uppercase tracking-[0.2em] text-[11px] shadow-md">
              <a href={`/contact?subject=${encodeURIComponent(`Group quote — ${displayName}`)}`}>
                Request Quote <ArrowRight className="size-3.5 ml-1" />
              </a>
            </Button>
          ) : (
            <Button onClick={onSelect} disabled={!!disabled} variant="navy" className="w-full h-12 rounded-lg uppercase tracking-[0.2em] text-[11px] shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              Continue <ArrowRight className="size-3.5 ml-1" />
            </Button>
          )}
          {!quoteOnly && disabled && disabledReason && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{disabledReason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-foreground/75 text-[13px]">
      <span className="text-[var(--gold-ink)] shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------
// Step 02 — Passenger contact details (no extras, no submit)
// ---------------------------------------------------------------
function ContactStep({ contact, onChange, onBack, onNext }: {
  contact: Contact; onChange: (c: Contact) => void;
  onBack: () => void; onNext: () => void;
}) {
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => onChange({ ...contact, [k]: v });
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Step 02 — Passenger details</p>
        <h2 className="mt-1 font-display text-2xl md:text-3xl font-bold">Who is travelling?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll use these details to confirm your booking and keep you updated.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name" icon={<User className="size-4" />}>
          <Input value={contact.customer_name} onChange={(e) => set("customer_name", e.target.value)} required maxLength={100} />
        </Field>
        <Field label="Phone" icon={<Phone className="size-4" />}>
          <PhoneInput value={contact.phone} onChange={(v) => set("phone", v)} required />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email" icon={<Mail className="size-4" />}>
          <Input type="email" value={contact.email} onChange={(e) => set("email", e.target.value)} required maxLength={255} />
        </Field>
        <Field label="WhatsApp number (optional)" icon={<MessageSquare className="size-4" />}>
          <PhoneInput value={contact.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="7700 900123" />
        </Field>
      </div>
      <Field label="Flight number (optional)">
        <Input value={contact.flight_number} onChange={(e) => set("flight_number", e.target.value)} maxLength={20} placeholder="e.g. BA1234" />
      </Field>
      <Field label="Notes (optional)" icon={<MessageSquare className="size-4" />}>
        <Textarea value={contact.notes} onChange={(e) => set("notes", e.target.value)} rows={4} maxLength={1000} placeholder="Anything our driver should know" />
      </Field>

      <div id="step-actions" className="flex flex-wrap gap-3 pt-2 scroll-mt-24">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button type="button" onClick={onNext}
          variant="gold" className="ml-auto tracking-wider px-8 gap-2">
          Continue to extras <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Step 03 — Extras (stops + child seats + meet & greet + return + policy)
// ---------------------------------------------------------------
type ScenicStop = { place_id: string; label: string; minutes: number; category?: string | null };

function ExtrasStep(props: {
  pois: PoiSuggestion[];
  template: RouteTemplateSummary | null;
  poisLoading: boolean;
  selectedStops: Record<string, number>;
  onToggleStop: (poi: PoiSuggestion) => void;
  onStopMinutes: (placeId: string, minutes: number) => void;
  routeMode: "direct" | "scenic" | "optimised";
  onRouteModeChange: (m: "direct" | "scenic" | "optimised") => void;
  multiQuote: MultiStopQuoteResult | null;
  multiLoading: boolean;
  multiError: Error | null;
  converted: boolean;
  needsAck: boolean;
  onAck: () => void;
  childSeatFeePence: number;
  childSeatCount: number;
  onChildSeatCount: (n: number) => void;
  meetGreet: boolean;
  onMeetGreet: (v: boolean) => void;
  returnJourney: boolean;
  onReturnJourney: (v: boolean) => void;
  policy: Policy;
  onPolicy: (p: Policy) => void;
  baseRideTotal: number;
  seatFee: number;
  meetGreetFee: number;
  returnFee: number;
  meetGreetFeePence: number;
  returnJourneyFeePence: number;
  policyCfg: { nonRefundablePercent: number; nonRefundableMinPence: number; flexiblePercent: number; flexibleMinPence: number };
  onBack: () => void;
  onNext: () => void;
}) {
  const {
    pois, template, poisLoading, selectedStops, onToggleStop, onStopMinutes,
    routeMode, onRouteModeChange, multiQuote, multiLoading, multiError,
    converted, needsAck, onAck,
    childSeatFeePence, childSeatCount, onChildSeatCount,
    meetGreet, onMeetGreet, returnJourney, onReturnJourney,
    policy, onPolicy, baseRideTotal, seatFee, meetGreetFee, returnFee,
    meetGreetFeePence, returnJourneyFeePence, policyCfg, onBack, onNext,
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Step 03 — Extras</p>
        <h2 className="mt-1 font-display text-2xl md:text-3xl font-bold">Personalise your journey</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add scenic stops, child seats, meet &amp; greet, a return trip and pick your cancellation cover — all in one place.
        </p>
      </div>

      {/* --- Famous stops along the route --- */}
      <ExtrasCard
        icon={<Landmark className="size-4" />}
        eyebrow="Famous points along the way"
        title="Add scenic stops"
        subtitle="Break up your transfer with iconic viewpoints, castles and villages between your pickup and dropoff. Each stop has its own visit time and stay charge."
      >
        <ScenicPoiPanel
          template={template}
          pois={pois}
          isLoading={poisLoading}
          selectedStops={selectedStops}
          onToggle={onToggleStop}
          onDurationChange={onStopMinutes}
          routeMode={routeMode}
          onRouteModeChange={onRouteModeChange}
          multiQuote={multiQuote}
          multiLoading={multiLoading}
          multiError={multiError}
        />
      </ExtrasCard>

      {converted && multiQuote && (
        <TourConversionBanner
          from={multiQuote.original_service_type}
          to={multiQuote.service_type}
          reason={multiQuote.classification_reason}
          acked={!needsAck}
          onAck={onAck}
        />
      )}

      {/* --- Comfort extras --- */}
      <ExtrasCard
        icon={<Sparkles className="size-4" />}
        eyebrow="Comfort & assistance"
        title="Onboard extras"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={childSeatFeePence > 0 ? `Child seats (£${(childSeatFeePence / 100).toFixed(2)} each)` : "Child seats"}>
            <Select value={String(childSeatCount)} onValueChange={(v) => onChildSeatCount(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "None" : `${n} child seat${n === 1 ? "" : "s"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3">
            <Toggle
              label={meetGreetFeePence > 0 ? `Meet & greet at arrivals (+£${(meetGreetFeePence / 100).toFixed(2)})` : "Meet & greet at arrivals"}
              checked={meetGreet} onChange={onMeetGreet}
            />
            <Toggle
              label={returnJourneyFeePence > 0 ? `Add return journey (+£${(returnJourneyFeePence / 100).toFixed(2)})` : "Add return journey"}
              checked={returnJourney} onChange={onReturnJourney}
            />
          </div>
        </div>
      </ExtrasCard>

      {/* --- Cancellation policy tiers --- */}
      <ExtrasCard
        icon={<Shield className="size-4" />}
        eyebrow="Cancellation cover"
        title="Choose how flexible you want to be"
      >
        <PolicyTiers value={policy} onChange={onPolicy} base={baseRideTotal + seatFee + meetGreetFee + returnFee} cfg={policyCfg} />
      </ExtrasCard>

      {/* --- Running total (desktop only; mobile shows sticky bar) --- */}
      <div className="hidden lg:flex rounded-2xl border border-border bg-card p-5 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Running total</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ride £{baseRideTotal.toFixed(2)}
            {seatFee > 0 && <> · Child seats £{seatFee.toFixed(2)}</>}
            {meetGreetFee > 0 && <> · Meet &amp; greet £{meetGreetFee.toFixed(2)}</>}
            {returnFee > 0 && <> · Return £{returnFee.toFixed(2)}</>}
            {" · "}Cancellation cover: <span className="font-semibold text-foreground/80">{policy === "non_refundable" ? "Non-refundable" : policy === "flexible" ? "Flexible" : "Standard"}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold text-[var(--gold-ink)] tabular-nums">
            £{(() => {
              const base = baseRideTotal + seatFee + meetGreetFee + returnFee;
              const delta = policy === "non_refundable"
                ? -Math.max(policyCfg.nonRefundableMinPence / 100, Math.round(base * (policyCfg.nonRefundablePercent / 100) * 100) / 100)
                : policy === "flexible"
                ? Math.max(policyCfg.flexibleMinPence / 100, Math.round(base * (policyCfg.flexiblePercent / 100) * 100) / 100)
                : 0;
              return (base + delta).toFixed(2);
            })()}
          </p>
        </div>
      </div>

      <div id="step-actions" className="flex flex-wrap gap-3 pt-2 scroll-mt-24">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={needsAck}
          variant="gold" className="ml-auto tracking-wider px-8 gap-2"
        >
          Continue to payment <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ExtrasCard({ icon, eyebrow, title, subtitle, children }: {
  icon: React.ReactNode; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border shadow-sm p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">{eyebrow}</p>
          <h3 className="font-display font-bold text-lg mt-0.5">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function PolicyTiers({ value, onChange, base, cfg }: {
  value: Policy; onChange: (p: Policy) => void; base: number;
  cfg: { nonRefundablePercent: number; nonRefundableMinPence: number; flexiblePercent: number; flexibleMinPence: number };
}) {
  const nonRefDelta = -Math.max(cfg.nonRefundableMinPence / 100, Math.round(base * (cfg.nonRefundablePercent / 100) * 100) / 100);
  const flexDelta = Math.max(cfg.flexibleMinPence / 100, Math.round(base * (cfg.flexiblePercent / 100) * 100) / 100);
  const tiers: Array<{
    id: Policy; title: string; icon: React.ReactNode; badge?: string; badgeClass?: string;
    headline: string; body: string; delta: number;
  }> = [
    {
      id: "non_refundable", title: "Non-refundable", icon: <Package className="size-5" />,
      badge: "Lowest price", badgeClass: "bg-foreground/10 text-foreground",
      headline: "Best price, no refund.",
      body: "You save the most, with no refund if you cancel after confirmation.",
      delta: nonRefDelta,
    },
    {
      id: "standard", title: "Standard", icon: <CalendarClock className="size-5" />,
      badge: "Most popular", badgeClass: "bg-[var(--gold)] text-[var(--gold-foreground)]",
      headline: "Cancel up to a day before.",
      body: "Full refund if you cancel up to 24 hours before pickup.",
      delta: 0,
    },
    {
      id: "flexible", title: "Flexible", icon: <Shield className="size-5" />,
      badge: "Safest choice", badgeClass: "bg-success/15 text-success",
      headline: "Refundable up to the last hour.",
      body: "The most freedom — full refund if you cancel up to 1 hour before pickup.",
      delta: flexDelta,
    },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {tiers.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${
              selected
                ? "border-[var(--gold)] bg-[var(--gold)]/5 shadow-[0_10px_30px_-15px_rgba(223,175,38,0.4)]"
                : "border-border bg-background hover:border-[var(--gold)]/40"
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                selected ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "bg-[var(--surface)] text-foreground/70"
              }`}>{t.icon}</span>
              <span className="font-display font-bold">{t.title}</span>
            </div>
            {t.badge && (
              <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 ${t.badgeClass}`}>
                {t.badge}
              </span>
            )}
            <p className="mt-3 text-sm font-semibold">{t.headline}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.body}</p>
            <p className={`mt-3 text-sm font-bold ${t.delta < 0 ? "text-success" : t.delta > 0 ? "text-foreground" : "text-[var(--gold-ink)]"}`}>
              {t.delta === 0 ? "Included" : t.delta < 0 ? `Save £${Math.abs(t.delta).toFixed(2)}` : `+ £${t.delta.toFixed(2)}`}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// Step 04 — Payment method
// ---------------------------------------------------------------
function PaymentStep({ value, onChange, grandTotal, onBack, onSubmit, submitting }: {
  value: PaymentMethod; onChange: (v: PaymentMethod) => void;
  grandTotal: number; onBack: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const options: Array<{ id: PaymentMethod; icon: React.ReactNode; title: string; body: string; badge?: string }> = [
    {
      id: "card_on_confirmation", icon: <CreditCard className="size-5" />, title: "Card payment",
      body: "Our team will contact you to arrange a secure payment once we've confirmed availability.",
      badge: "Most popular",
    },
    {
      id: "bank_transfer", icon: <Landmark className="size-5" />, title: "Bank transfer",
      body: "We'll share our UK bank details when we confirm your booking.",
    },
    {
      id: "pay_on_account", icon: <Banknote className="size-5" />, title: "Pay on account",
      body: "For corporate customers with an approved Cabslink account.",
    },
  ];
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Step 04 — Payment</p>
          <h2 className="mt-1 font-display text-2xl md:text-3xl font-bold">How would you like to pay?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a payment method — nothing is charged until our team confirms your booking.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Total due</p>
          <p className="font-display text-3xl font-bold text-[var(--gold-ink)] tabular-nums">£{grandTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((o) => {
          const selected = value === o.id;
          return (
            <button key={o.id} type="button" onClick={() => onChange(o.id)}
              className={`w-full text-left rounded-2xl border-2 p-5 transition-all flex items-start gap-4 ${
                selected ? "border-[var(--gold)] bg-[var(--gold)]/5" : "border-border bg-background hover:border-[var(--gold)]/40"
              }`}>
              <span className={`size-10 rounded-xl grid place-items-center shrink-0 ${
                selected ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "bg-[var(--surface)] text-foreground/70"
              }`}>{o.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold">{o.title}</span>
                  {o.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 bg-[var(--gold)] text-[var(--gold-foreground)]">
                      {o.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{o.body}</p>
              </div>
              <span className={`size-5 mt-1 rounded-full border-2 grid place-items-center shrink-0 ${
                selected ? "border-[var(--gold)]" : "border-muted-foreground/40"
              }`}>
                {selected && <span className="size-2.5 rounded-full bg-[var(--gold)]" />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Submitting sends your journey to our team. Our office will confirm availability and payment
        arrangements. Online card payments are not enabled at this time.
      </p>

      <div id="step-actions" className="flex flex-wrap gap-3 scroll-mt-24">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting}
          variant="gold" className="ml-auto tracking-wider px-8 gap-2">
          {submitting ? "Sending…" : <>Submit booking request <ArrowRight className="size-4" /></>}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  // Associate the visible label with its control so screen readers announce it.
  const autoId = useId();
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? autoId })
    : children;
  return (
    <div>
      <Label htmlFor={autoId} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {icon}{label}
      </Label>
      {control}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 cursor-pointer hover:border-[var(--gold)]/50 transition">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Fallback shown only when the confirmation token could not be issued. */
function AlreadySubmittedStep({ card, qty, onBack }: { card: QuoteCard; qty: number; onBack: () => void }) {
  const total = card.finalPrice * qty;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
      <CheckCircle2 className="size-12 text-[var(--gold-ink)] mx-auto" />
      <h2 className="mt-3 font-display text-2xl font-bold">Booking request received</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Please save your booking reference. Our team will contact you to confirm the booking and
        payment arrangements.
      </p>
      <div className="mt-6 inline-block bg-[var(--surface)] rounded-xl border border-border px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Estimated fare {qty > 1 ? `(${qty} × ${card.name})` : ""}
        </p>
        <p className="font-display text-3xl font-bold mt-1">£{total.toFixed(2)}</p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button asChild className="bg-[var(--navy)] text-[var(--gold)] hover:bg-[var(--navy)]! hover:text-[var(--gold)]! gap-2">
          <Link to="/">Done</Link>
        </Button>
      </div>
    </div>
  );
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function fmtHm(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm} min`;
  if (mm === 0) return `${h} h`;
  return `${h} h ${mm} min`;
}

function ScenicPoiPanel({
  template, pois, isLoading, selectedStops, onToggle, onDurationChange,
  routeMode, onRouteModeChange, multiQuote, multiLoading, multiError,
}: {
  template: RouteTemplateSummary | null;
  pois: PoiSuggestion[];
  isLoading: boolean;
  selectedStops: Record<string, number>;
  onToggle: (poi: PoiSuggestion) => void;
  onDurationChange: (placeId: string, minutes: number) => void;
  routeMode: "direct" | "scenic" | "optimised";
  onRouteModeChange: (m: "direct" | "scenic" | "optimised") => void;
  multiQuote: MultiStopQuoteResult | null;
  multiLoading: boolean;
  multiError: Error | null;
}) {
  if (isLoading) {
    return <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">Checking for scenic stops on this route…</div>;
  }
  if (!template || pois.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        No curated famous stops are available for this route yet — you can continue with a direct transfer.
      </div>
    );
  }

  const orderLocked = template.default_order_locked;
  const modes: Array<{ id: "scenic" | "optimised" | "direct"; label: string }> = orderLocked
    ? [{ id: "scenic", label: "Scenic order" }, { id: "direct", label: "Direct" }]
    : [
        { id: "scenic", label: "Recommended scenic" },
        { id: "optimised", label: "Fastest" },
        { id: "direct", label: "Direct" },
      ];

  const anySelected = Object.keys(selectedStops).length > 0;
  const svc = multiQuote?.service_type;
  const svcLabel =
    svc === "private_tour" ? "Private Tour"
    : svc === "sightseeing_transfer" ? "Sightseeing Transfer"
    : svc === "transfer_with_stop" ? "Transfer with stop"
    : svc === "direct_transfer" ? "Direct transfer"
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-sm">{template.name}</h4>
        {template.description && (
          <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
        )}
      </div>

      <ul className="grid gap-2">
        {pois.map((p) => {
          const active = selectedStops[p.place_id] !== undefined;
          const minutes = selectedStops[p.place_id] ?? p.recommended_visit_minutes;
          return (
            <li key={p.id}
              className={`rounded-xl border p-3 transition ${active ? "border-[var(--gold)] bg-[var(--gold)]/5" : "border-border bg-background"}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--gold)]"
                  checked={active} onChange={() => onToggle(p)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-foreground/60 whitespace-nowrap">~{p.recommended_visit_minutes} min</div>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{p.category.replace(/_/g, " ")}</div>
                  {p.short_description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.short_description}</p>
                  )}
                </div>
              </label>
              {active && (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-7">
                  {DURATION_OPTIONS.filter((m) => m >= p.minimum_visit_minutes && m <= p.maximum_visit_minutes).map((m) => (
                    <button key={m} type="button" onClick={() => onDurationChange(p.place_id, m)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                        minutes === m ? "bg-[var(--navy)] text-[var(--gold)] border-[var(--navy)]" : "border-border text-foreground/70 hover:border-[var(--gold)]"
                      }`}>{m} min</button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {anySelected && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {modes.map((m) => (
              <button key={m.id} type="button" onClick={() => onRouteModeChange(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  routeMode === m.id ? "bg-[var(--navy)] text-[var(--gold)] border-[var(--navy)]" : "border-border text-foreground/70 hover:border-[var(--gold)]"
                }`}>{m.label}</button>
            ))}
          </div>

          {multiLoading && <div className="text-xs text-muted-foreground">Recalculating your journey…</div>}
          {multiError && <div className="text-xs text-destructive">{multiError.message}</div>}
          {multiQuote && !multiLoading && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <ItineraryRow label="Driving" value={fmtHm(multiQuote.driving_duration_seconds)} />
                <ItineraryRow label="Planned visits" value={fmtHm(multiQuote.planned_stop_duration_seconds)} />
                <ItineraryRow label="Total" value={fmtHm(multiQuote.total_journey_seconds)} bold />
              </div>
              <div className="text-[11px] text-muted-foreground">
                +{multiQuote.detour_miles.toFixed(1)} mi / +{fmtHm(multiQuote.detour_seconds)} vs direct
                {svcLabel && <> · Classified as <span className="font-semibold text-foreground/80">{svcLabel}</span></>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItineraryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</div>
      <div className={`text-sm ${bold ? "font-bold" : "font-semibold"} text-foreground`}>{value}</div>
    </div>
  );
}
