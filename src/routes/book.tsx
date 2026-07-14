import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

import { calculateQuotes, createBooking, type QuoteCard } from "@/lib/pricing.functions";
import { listPoisForRoute, type PoiSuggestion, type RouteTemplateSummary } from "@/lib/pois.functions";

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  head: () => ({
    meta: [
      { title: "Book Now — Cabslink UK Airport Transfer & Chauffeur" },
      { name: "description", content: "Choose a vehicle and book a premium UK airport transfer with Cabslink. Instant quote, transparent pricing, 24/7 confirmation." },
      { property: "og:title", content: "Book your ride — Cabslink" },
      { property: "og:url", content: "/book" },
    ],
    links: [{ rel: "canonical", href: "/book" }],
  }),
  component: BookPage,
});

// -------------------------------------------------------------------
// Prefill parsing — Place-IDs are required for a real quote.
// -------------------------------------------------------------------
type Prefill = {
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  stops: SelectedPlace[];
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  ret: boolean;
  rdate: string;
  rtime: string;
  mode: "quote" | "hourly";
};

function decodeStops(raw: string): SelectedPlace[] {
  if (!raw) return [];
  return raw.split("|").flatMap((chunk) => {
    const [id, ...rest] = chunk.split("::");
    if (!id || !rest.length) return [];
    try {
      return [{ placeId: id, label: decodeURIComponent(rest.join("::")) }];
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
    p.set("stops", pre.stops.map((s) => `${s.placeId}::${encodeURIComponent(s.label)}`).join("|"));
  }
  if (pre.ret) {
    p.set("ret", "1");
    if (pre.rdate) p.set("rdate", pre.rdate);
    if (pre.rtime) p.set("rtime", pre.rtime);
  }
  return p.toString();
}

type Step = "vehicle" | "details" | "review";

function BookPage() {
  const { q } = Route.useSearch();
  const pre = readPrefill(q);
  const navigate = useNavigate({ from: "/book" });
  const [step, setStep] = useState<Step>("vehicle");
  const [chosen, setChosen] = useState<QuoteCard | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [editOpen, setEditOpen] = useState(false);

  const hasValidRoute = !!pre.pickup?.placeId && !!pre.dropoff?.placeId
    && pre.pickup.placeId !== pre.dropoff.placeId;

  const applyEdit = (next: Prefill) => {
    // Any location change invalidates the current vehicle selection.
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

  return (
    <SiteLayout>
      <section className="relative bg-[var(--surface)] py-10 md:py-14 min-h-[80vh] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden>
          <div className="absolute -top-24 -left-24 size-96 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-[var(--navy)]/5 blur-3xl" />
        </div>

        <div className="container-x relative">
          {!hasValidRoute ? (
            <EmptyJourneyState onEdit={() => setEditOpen(true)} />
          ) : (
            <>
              <Stepper step={step} />
              <div className="mt-8 grid lg:grid-cols-[340px_1fr] gap-6 items-start">
                <Sidebar
                  pre={pre}
                  onEdit={() => setEditOpen(true)}
                  route={quoteQuery.data ? { miles: quoteQuery.data.distanceMiles, minutes: quoteQuery.data.durationMinutes } : null}
                />
                <div className="min-w-0">
                  {step === "vehicle" && (
                    <VehicleStep
                      pre={pre}
                      data={quoteQuery.data}
                      isLoading={quoteQuery.isLoading}
                      error={quoteQuery.error as Error | null}
                      onRetry={() => quoteQuery.refetch()}
                      onSelect={(card, quantity) => { setChosen(card); setQty(quantity); setStep("details"); }}
                    />
                  )}
                  {step === "details" && chosen && (
                    <DetailsStep pre={pre} card={chosen} qty={qty}
                      onBack={() => setStep("vehicle")}
                      onSuccess={(token) => {
                        if (token) navigate({ to: "/booking/$token", params: { token } });
                        else setStep("review");
                      }} />
                  )}
                  {step === "review" && chosen && (
                    <AlreadySubmittedStep card={chosen} qty={qty} onBack={() => setStep("details")} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <EditTripDialog open={editOpen} onOpenChange={setEditOpen} initial={pre} onSave={applyEdit} />
    </SiteLayout>
  );
}


function EmptyJourneyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div
      data-testid="book-empty-state"
      className="max-w-xl mx-auto mt-10 rounded-3xl border border-border bg-card p-10 text-center space-y-5"
    >
      <MapPin className="size-10 mx-auto text-[var(--gold)]" />
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Enter your journey first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose pickup and destination from the suggestions to get an instant quote.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="gold" className="rounded-full">
          <Link to="/" hash="booking">Start a booking</Link>
        </Button>
        <Button variant="outline" className="rounded-full" onClick={onEdit}>Enter here instead</Button>
      </div>
    </div>
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
    { id: "review", label: "Review" },
  ];

  const idx = items.findIndex((x) => x.id === step);
  return (
    <div className="flex items-center justify-center gap-3 md:gap-4">
      {items.map((it, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={it.id} className="flex items-center gap-3">
            <div className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
              active ? "bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]"
              : done ? "bg-[var(--navy)] text-[var(--gold)]"
              : "bg-card text-foreground/55 border border-border"
            }`}>{it.label}</div>
            {i < items.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function Sidebar({ pre, onEdit, route }: {
  pre: Prefill; onEdit: () => void;
  route: { miles: number; minutes: number } | null;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
      <div className="relative bg-card rounded-2xl border border-border p-6 shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)] overflow-hidden">
        <div className="absolute -top-16 -right-16 size-40 rounded-full bg-[var(--gold)]/10 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)]">Your Journey</p>
            <h3 className="font-display font-bold text-lg text-foreground mt-0.5">Trip Summary</h3>
          </div>
          <button onClick={onEdit} className="size-8 rounded-full border border-border text-muted-foreground hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center justify-center transition" aria-label="Edit trip">
            <Edit3 className="size-3.5" />
          </button>
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
              <div className="flex items-center gap-1.5 text-[var(--gold)]">
                <MapPin className="size-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Distance</span>
              </div>
              <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums leading-none">
                {route.miles.toFixed(1)}<span className="text-xs font-semibold text-muted-foreground ml-1">mi</span>
              </p>
            </div>
            <div className="bg-[var(--surface)] rounded-xl p-3 border border-border/60">
              <div className="flex items-center gap-1.5 text-[var(--gold)]">
                <Clock className="size-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Duration</span>
              </div>
              <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums leading-none">
                {route.minutes}<span className="text-xs font-semibold text-muted-foreground ml-1">min</span>
              </p>
            </div>
            <p className="col-span-2 text-[10px] text-muted-foreground flex items-start gap-1.5 mt-1">
              <BadgeCheck className="size-3 mt-0.5 text-[var(--gold)] shrink-0" />
              Real driving distance from Google Routes.
            </p>
          </div>
        )}

        <div className="relative mt-5 pt-4 border-t border-border grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="size-3 text-[var(--gold)]" /> Date
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{pre.date || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3 text-[var(--gold)]" /> Time
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{pre.time || "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)] mb-1">Why Cabslink</p>
        {[
          "10,000+ passengers transferred",
          "Team confirms availability quickly",
          "All-inclusive fixed pricing",
          "Pay by card or on account after we confirm",
        ].map((t) => (
          <div key={t} className="flex gap-2 text-sm">
            <CheckCircle2 className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />
            <span className="text-foreground/80">{t}</span>
          </div>
        ))}
      </div>
    </aside>
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
  return (
    <div>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)]">Step 01 — Choose Your Ride</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
            Book Your Ride · {pre.ret ? "Return" : "One Way"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Every fare is all-inclusive — no surge, no hidden fees.</p>
        </div>
        {data && (
          <div className="inline-flex items-center gap-2 bg-[var(--navy)] text-[var(--navy-foreground)] rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest">
            <BadgeCheck className="size-3.5 text-[var(--gold)]" />
            {data.quotes.length} vehicles available
          </div>
        )}
      </div>

      <div className="space-y-6">
        {isLoading && (
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
        {data?.quotes.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
            No vehicles match these passenger / luggage requirements.
          </div>
        )}
        {data?.quotes.map((q, i) => {
          const qty = qtyMap[q.vehicleId] ?? 1;
          return (
            <VehicleCard key={q.vehicleId} card={q} best={i === 0} qty={qty}
              onQtyChange={(n) => setQtyMap((m) => ({ ...m, [q.vehicleId]: n }))}
              onSelect={() => onSelect(q, qty)} />
          );
        })}
      </div>
    </div>
  );
}

function VehicleCard({ card, best, qty, onQtyChange, onSelect }: {
  card: QuoteCard; best: boolean; qty: number;
  onQtyChange: (n: number) => void; onSelect: () => void;
}) {
  const total = card.finalPrice * qty;
  const serial = card.vehicleId.slice(0, 8).toUpperCase();
  return (
    <div className={`relative flex flex-col md:flex-row bg-card rounded-2xl shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)] border transition-all duration-500 hover:shadow-[0_20px_60px_-20px_rgba(223,175,38,0.35)] ${best ? "border-[var(--gold)]/60" : "border-border"}`}>
      {best && (
        <div className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-md shadow-md">
          <Award className="size-3" /> Best Value
        </div>
      )}

      <div className="flex-1 min-w-0 p-5 md:p-6 flex flex-col md:flex-row gap-5 md:gap-6">
        <div className="w-full md:w-44 lg:w-48 flex-shrink-0 flex items-center justify-center bg-[var(--surface)] rounded-xl p-3">
          <img src={card.imageUrl} alt={card.name} className="w-full aspect-[3/2] object-contain" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
                  <BadgeCheck className="size-3" /> Private Transfer
                </span>
                <h3 className="mt-1.5 font-display text-lg md:text-xl font-bold uppercase tracking-tight text-foreground leading-tight break-words">
                  {card.name}
                </h3>
              </div>
              <div className="flex gap-0.5 text-[var(--gold)] shrink-0 pt-1">
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
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">All Inclusive</p>
          <div className="mt-2 flex items-baseline justify-center gap-0.5 text-foreground">
            <span className="text-lg font-display font-bold text-[var(--gold)]">£</span>
            <span className="text-3xl md:text-4xl font-display font-bold tabular-nums tracking-tight">{total.toFixed(2)}</span>
          </div>
          {qty > 1 && (<p className="text-[11px] text-muted-foreground mt-1">{qty} × £{card.finalPrice.toFixed(2)}</p>)}
          <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
            <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3 text-[var(--gold)]" /> No hidden cost</p>
            <p className="flex items-center justify-center gap-1.5"><Clock className="size-3 text-[var(--gold)]" /> Free cancellation</p>
          </div>
        </div>

        <div className="w-full mt-5 space-y-3">
          <div className="w-full">
            <Label className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Vehicles</Label>
            <Select value={String(qty)} onValueChange={(v) => onQtyChange(Number(v))}>
              <SelectTrigger className="mt-1 h-10 border-[var(--gold)]/50 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (<SelectItem key={n} value={String(n)}>{n} × Vehicle</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onSelect} className="w-full h-12 rounded-lg bg-[var(--navy)] hover:bg-[var(--gold)] text-[var(--navy-foreground)] hover:text-[var(--gold-foreground)] font-bold uppercase tracking-[0.2em] text-[11px] transition-all shadow-md">
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-foreground/75 text-[13px]">
      <span className="text-[var(--gold)] shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </li>
  );
}

const detailsSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  flight_number: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function DetailsStep({ pre, card, qty, onBack, onSuccess }:
  { pre: Prefill; card: QuoteCard; qty: number; onBack: () => void; onSuccess: (token: string | null) => void }) {
  const [meetGreet, setMeetGreet] = useState(true);
  const [childSeat, setChildSeat] = useState(false);
  const [returnJourney, setReturnJourney] = useState(pre.ret);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(false);
  // One idempotency key per genuine submission attempt — regenerated on success.
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const total = card.finalPrice * qty;

  const bookFn = useServerFn(createBooking);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inflight.current) return;
    if (!pre.pickup || !pre.dropoff) { toast.error("Journey is missing pickup or destination."); return; }
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = detailsSchema.safeParse(fd);
    if (!parsed.success) { toast.error("Please fill in name, email and phone."); return; }
    inflight.current = true;
    setLoading(true);
    try {
      const res = await bookFn({
        data: {
          idempotencyKey: idempotencyKey.current,
          vehicleId: card.vehicleId,
          vehicleCount: qty,
          pickupPlaceId: pre.pickup.placeId,
          pickupLabel: pre.pickup.label,
          destinationPlaceId: pre.dropoff.placeId,
          destinationLabel: pre.dropoff.label,
          stops: pre.stops,
          pickupDate: pre.date,
          pickupTime: pre.time,
          passengers: pre.passengers,
          luggage: pre.luggage,
          customer_name: parsed.data.customer_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          flight_number: parsed.data.flight_number || null,
          notes: parsed.data.notes || null,
          child_seat: childSeat,
          meet_greet: meetGreet,
          return_journey: returnJourney,
        },
      });
      toast.success("Booking request received.");
      idempotencyKey.current = crypto.randomUUID();
      onSuccess((res as any)?.token ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save booking. Try again or call us.");
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <img src={card.imageUrl} alt="" className="w-16 h-12 object-contain" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Selected vehicle</p>
          <p className="font-display font-bold">{qty > 1 ? `${qty} × ${card.name}` : card.name}</p>
        </div>
        <p className="font-display font-bold text-2xl">£{total.toFixed(2)}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name" icon={<User className="size-4" />}><Input name="customer_name" required maxLength={100} /></Field>
        <Field label="Phone" icon={<Phone className="size-4" />}><Input name="phone" required maxLength={30} /></Field>
      </div>
      <Field label="Email" icon={<Mail className="size-4" />}><Input name="email" type="email" required maxLength={255} /></Field>
      <Field label="Flight number (optional)"><Input name="flight_number" maxLength={20} placeholder="e.g. BA1234" /></Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Toggle label="Meet & greet" checked={meetGreet} onChange={setMeetGreet} />
        <Toggle label="Child seat" checked={childSeat} onChange={setChildSeat} />
        <Toggle label="Return journey" checked={returnJourney} onChange={setReturnJourney} />
      </div>

      <Field label="Notes (optional)" icon={<MessageSquare className="size-4" />}>
        <Textarea name="notes" rows={4} maxLength={1000} placeholder="Anything our chauffeur should know" />
      </Field>

      <p className="text-xs text-muted-foreground">
        Submitting sends your journey to our team. Our office will confirm availability and payment
        arrangements. Online card payments are not enabled at this time.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button type="submit" disabled={loading} className="ml-auto bg-[var(--gold)] text-[var(--gold-foreground)] hover:brightness-110 font-bold tracking-wider px-8">
          {loading ? "Sending…" : <>Submit booking request <ArrowRight className="size-4 ml-1" /></>}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {icon}{label}
      </Label>
      {children}
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

/** Fallback shown only when the confirmation token could not be issued
 *  (e.g. duplicate submission returned an existing booking without a token). */
function AlreadySubmittedStep({ card, qty, onBack }: { card: QuoteCard; qty: number; onBack: () => void }) {
  const total = card.finalPrice * qty;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
      <CheckCircle2 className="size-12 text-[var(--gold)] mx-auto" />
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
        <Button asChild className="bg-[var(--navy)] text-[var(--gold)] hover:bg-[var(--navy)] gap-2">
          <Link to="/">Done</Link>
        </Button>
      </div>
    </div>
  );
}

