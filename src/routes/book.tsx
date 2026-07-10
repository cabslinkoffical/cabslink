import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRight, ArrowLeft, MapPin, Flag, CalendarDays, Edit3, Star,
  Users, Briefcase, Luggage, BadgeCheck, Clock, DoorOpen, UserCheck, Award,
  ShieldCheck, CreditCard, User, Mail, Phone, MessageSquare,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { calculateQuotes, createBooking, type QuoteCard } from "@/lib/pricing.functions";

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

type Prefill = ReturnType<typeof readPrefill>;
function readPrefill(q: string) {
  const p = new URLSearchParams(q);
  return {
    pickup: p.get("pickup") ?? "",
    dropoff: p.get("dropoff") ?? "",
    date: p.get("date") ?? new Date().toISOString().slice(0, 10),
    time: p.get("time") ?? "12:00",
    passengers: Math.max(1, Number(p.get("passengers")) || 1),
    luggage: Math.max(0, Number(p.get("luggage")) || 0),
    stops: (p.get("stops") ?? "").split("|").filter(Boolean),
    ret: p.get("ret") === "1",
    rdate: p.get("rdate") ?? "",
    rtime: p.get("rtime") ?? "",
    mode: (p.get("mode") as "quote" | "hourly") ?? "quote",
  };
}

type Step = "vehicle" | "details" | "payment";

function BookPage() {
  const { q } = Route.useSearch();
  const pre = readPrefill(q);
  const [step, setStep] = useState<Step>("vehicle");
  const [chosen, setChosen] = useState<QuoteCard | null>(null);
  const [qty, setQty] = useState<number>(1);

  const quoteFn = useServerFn(calculateQuotes);
  const quoteQuery = useQuery({
    queryKey: ["quotes", pre.pickup, pre.dropoff, pre.passengers, pre.luggage, pre.time, pre.stops.length],
    queryFn: () =>
      quoteFn({
        data: {
          pickup: pre.pickup || "Glasgow, UK",
          dropoff: pre.dropoff || "Edinburgh Airport",
          pickupDate: pre.date,
          pickupTime: pre.time,
          passengers: pre.passengers,
          luggage: pre.luggage,
          viaStops: pre.stops.length,
        } as any,
      }),
  });

  return (
    <SiteLayout>
      <section className="relative bg-[var(--surface)] py-10 md:py-14 min-h-[80vh] overflow-hidden">
        {/* soft ambient background */}
        <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden>
          <div className="absolute -top-24 -left-24 size-96 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-[var(--navy)]/5 blur-3xl" />
        </div>

        <div className="container-x relative">
          <Stepper step={step} />
          <div className="mt-8 grid lg:grid-cols-[340px_1fr] gap-6 items-start">
            <Sidebar
              pre={pre}
              onEdit={() => setStep("vehicle")}
              route={quoteQuery.data ? { miles: quoteQuery.data.distanceMiles, minutes: quoteQuery.data.durationMinutes } : null}
            />
            <div className="min-w-0">
              {step === "vehicle" && (
                <VehicleStep
                  pre={pre}
                  data={quoteQuery.data}
                  isLoading={quoteQuery.isLoading}
                  error={quoteQuery.error as Error | null}
                  onSelect={(card, quantity) => { setChosen(card); setQty(quantity); setStep("details"); }}
                />
              )}
              {step === "details" && chosen && (
                <DetailsStep
                  pre={pre}
                  card={chosen}
                  qty={qty}
                  onBack={() => setStep("vehicle")}
                  onContinue={() => setStep("payment")}
                />
              )}
              {step === "payment" && chosen && (
                <PaymentStep card={chosen} qty={qty} onBack={() => setStep("details")} />
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}


// =================================================================
// Stepper
// =================================================================
function Stepper({ step }: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: "vehicle", label: "Vehicle" },
    { id: "details", label: "Details" },
    { id: "payment", label: "Payment" },
  ];
  const idx = items.findIndex((x) => x.id === step);
  return (
    <div className="flex items-center justify-center gap-3 md:gap-4">
      {items.map((it, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={it.id} className="flex items-center gap-3">
            <div
              className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
                active
                  ? "bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]"
                  : done
                  ? "bg-[var(--navy)] text-[var(--gold)]"
                  : "bg-card text-foreground/55 border border-border"
              }`}
            >
              {it.label}
            </div>
            {i < items.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

// =================================================================
// Sidebar
// =================================================================
function Sidebar({
  pre, onEdit, route,
}: {
  pre: Prefill; onEdit: () => void;
  route: { miles: number; minutes: number } | null;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      {/* Trip card with journey timeline */}
      <div className="relative bg-card rounded-2xl border border-border p-6 shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)] overflow-hidden">
        <div className="absolute -top-16 -right-16 size-40 rounded-full bg-[var(--gold)]/10 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)]">Your Journey</p>
            <h3 className="font-display font-bold text-lg text-foreground mt-0.5">Trip Summary</h3>
          </div>
          <button
            onClick={onEdit}
            className="size-8 rounded-full border border-border text-muted-foreground hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center justify-center transition"
            aria-label="Edit trip"
          >
            <Edit3 className="size-3.5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-3 bottom-3 border-l-2 border-dashed border-[var(--gold)]/40" />
          <div className="relative">
            <div className="absolute -left-6 top-1.5 size-4 rounded-full bg-[var(--gold)] ring-4 ring-[var(--gold)]/20" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
            <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">{pre.pickup || "—"}</p>
          </div>
          <div className="relative mt-6">
            <div className="absolute -left-6 top-1.5 size-4 rounded-full border-2 border-[var(--gold)] bg-card" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Dropoff</p>
            <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">{pre.dropoff || "—"}</p>
          </div>
        </div>

        {/* Distance & time stats */}
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
              Calculated with real-time traffic &amp; optimized routing.
            </p>
          </div>
        )}

        {/* Date & time strip */}
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

      {/* Trust card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)] mb-1">Why Cabslink</p>
        {[
          "10,000+ passengers transferred",
          "Instant confirmation",
          "All-inclusive pricing",
          "Secure card payments",
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

function SidebarRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// =================================================================
// Step 1 — Vehicle selection
// =================================================================
function VehicleStep({
  pre, data, isLoading, error, onSelect,
}: {
  pre: Prefill;
  data: Awaited<ReturnType<typeof calculateQuotes>> | undefined;
  isLoading: boolean;
  error: Error | null;
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
          <p className="text-sm text-muted-foreground mt-1">
            Every fare is all-inclusive — no surge, no hidden fees.
          </p>
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
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-sm text-destructive">
            Couldn't load quotes. {(error as Error).message}
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
            <VehicleCard
              key={q.vehicleId}
              card={q}
              best={i === 0}
              qty={qty}
              onQtyChange={(n) => setQtyMap((m) => ({ ...m, [q.vehicleId]: n }))}
              onSelect={() => onSelect(q, qty)}
            />
          );
        })}
      </div>
    </div>
  );
}


function VehicleCard({
  card, best, qty, onQtyChange, onSelect,
}: {
  card: QuoteCard; best: boolean; qty: number;
  onQtyChange: (n: number) => void; onSelect: () => void;
}) {
  const total = card.finalPrice * qty;
  const serial = card.vehicleId.slice(0, 8).toUpperCase();
  return (
    <div
      className={`relative flex flex-col md:flex-row bg-card rounded-2xl shadow-[0_10px_40px_-20px_rgba(14,24,44,0.25)] border transition-all duration-500 hover:shadow-[0_20px_60px_-20px_rgba(223,175,38,0.35)] ${
        best ? "border-[var(--gold)]/60" : "border-border"
      }`}
    >
      {/* Best value ribbon */}
      {best && (
        <div className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-md shadow-md">
          <Award className="size-3" /> Best Value
        </div>
      )}

      {/* LEFT — vehicle info */}
      <div className="flex-1 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="w-full md:w-56 flex-shrink-0 flex items-center justify-center bg-[var(--surface)] rounded-xl p-3">
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full aspect-[3/2] object-contain"
            loading="lazy"
          />
        </div>

        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">
                  <BadgeCheck className="size-3" /> Private Transfer
                </span>
                <h3 className="mt-1.5 font-display text-2xl font-bold uppercase tracking-tight text-foreground">
                  {card.name}
                </h3>
              </div>
              <div className="flex gap-0.5 text-[var(--gold)] shrink-0 pt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Feature icon={<Users className="size-4" />}>{card.passengers * qty} Passengers</Feature>
              <Feature icon={<Briefcase className="size-4" />}>{card.luggage * qty} Luggage</Feature>
              <Feature icon={<Luggage className="size-4" />}>{card.handLuggage * qty} Hand Luggage</Feature>
              <Feature icon={<BadgeCheck className="size-4" />}>Meet &amp; Greet</Feature>
              <Feature icon={<Clock className="size-4" />}>Free Waiting</Feature>
              <Feature icon={<DoorOpen className="size-4" />}>Door to Door</Feature>
              <Feature icon={<UserCheck className="size-4" />}>Pro Driver</Feature>
            </ul>
          </div>

          <p className="mt-5 text-[9px] font-mono uppercase tracking-[0.3em] text-muted-foreground/70">
            No. {serial} · Cabslink Pass
          </p>
        </div>
      </div>

      {/* PERFORATION — notches + dashed line, cut against page surface */}
      <div className="relative hidden md:flex flex-col items-center justify-center px-1">
        <div className="absolute -top-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
        <div className="h-[calc(100%-2rem)] w-px border-l-2 border-dashed border-[var(--gold)]/40"></div>
        <div className="absolute -bottom-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
      </div>
      {/* Mobile perforation — horizontal */}
      <div className="relative md:hidden flex items-center justify-center py-1">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
        <div className="w-[calc(100%-2rem)] h-px border-t-2 border-dashed border-[var(--gold)]/40"></div>
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-[var(--surface)]"></div>
      </div>

      {/* RIGHT — price stub */}
      <div className="w-full md:w-72 bg-gradient-to-br from-[var(--gold)]/10 via-[var(--surface)] to-[var(--gold)]/5 md:rounded-r-2xl rounded-b-2xl md:rounded-b-none p-6 md:p-8 flex flex-col justify-between items-center text-center">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">All Inclusive</p>
          <div className="mt-2 flex items-baseline justify-center gap-0.5 text-foreground">
            <span className="text-xl font-display font-bold text-[var(--gold)]">£</span>
            <span className="text-4xl md:text-5xl font-display font-bold tabular-nums tracking-tight">
              {total.toFixed(2)}
            </span>
          </div>
          {qty > 1 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {qty} × £{card.finalPrice.toFixed(2)}
            </p>
          )}
          <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
            <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3 text-[var(--gold)]" /> No hidden cost</p>
            <p className="flex items-center justify-center gap-1.5"><Clock className="size-3 text-[var(--gold)]" /> Free cancellation</p>
          </div>
        </div>

        <div className="w-full mt-5 space-y-3">
          <div className="w-full">
            <Label className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Vehicles</Label>
            <Select value={String(qty)} onValueChange={(v) => onQtyChange(Number(v))}>
              <SelectTrigger className="mt-1 h-10 border-[var(--gold)]/50 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} × Vehicle</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onSelect}
            className="w-full h-12 rounded-lg bg-[var(--navy)] hover:bg-[var(--gold)] text-[var(--navy-foreground)] hover:text-[var(--gold-foreground)] font-bold uppercase tracking-[0.2em] text-[11px] transition-all shadow-md"
          >
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

// =================================================================
// Step 2 — Details
// =================================================================
const detailsSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  flight_number: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function DetailsStep({
  pre, card, qty, onBack, onContinue,
}: { pre: Prefill; card: QuoteCard; qty: number; onBack: () => void; onContinue: () => void }) {
  const [meetGreet, setMeetGreet] = useState(true);
  const [childSeat, setChildSeat] = useState(false);
  const [returnJourney, setReturnJourney] = useState(pre.ret);
  const [loading, setLoading] = useState(false);
  const total = card.finalPrice * qty;

  const bookFn = useServerFn(createBooking);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = detailsSchema.safeParse(fd);
    if (!parsed.success) { toast.error("Please fill in name, email and phone."); return; }
    setLoading(true);
    try {
      await bookFn({
        data: {
          vehicleId: card.vehicleId,
          vehicleCount: qty,
          pickup: pre.pickup,
          dropoff: pre.dropoff,
          pickupDate: pre.date,
          pickupTime: pre.time,
          passengers: pre.passengers,
          luggage: pre.luggage,
          viaStops: pre.stops.length,
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
      toast.success("Booking captured — choose payment next.");
      onContinue();
    } catch (err) {
      toast.error("Couldn't save booking. Try again or call us.");
    } finally {
      setLoading(false);
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

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button type="submit" disabled={loading} className="ml-auto bg-[var(--gold)] text-[var(--gold-foreground)] hover:brightness-110 font-bold tracking-wider px-8">
          {loading ? "Saving…" : <>Continue to payment <ArrowRight className="size-4 ml-1" /></>}
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

// =================================================================
// Step 3 — Payment placeholder
// =================================================================
function PaymentStep({ card, qty, onBack }: { card: QuoteCard; qty: number; onBack: () => void }) {
  const total = card.finalPrice * qty;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
      <CheckCircle2 className="size-12 text-[var(--gold)] mx-auto" />
      <h2 className="mt-3 font-display text-2xl font-bold">Booking captured</h2>
      <p className="mt-2 text-muted-foreground">
        We'll confirm shortly by email. Online payment will be enabled once a payment provider is connected.
      </p>
      <div className="mt-6 inline-block bg-[var(--surface)] rounded-xl border border-border px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Total to pay {qty > 1 ? `(${qty} × ${card.name})` : ""}
        </p>
        <p className="font-display text-3xl font-bold mt-1">£{total.toFixed(2)}</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button asChild className="bg-[var(--navy)] text-[var(--gold)] hover:bg-[var(--navy)] gap-2">
          <Link to="/">Done <CreditCard className="size-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
