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
import { supabase } from "@/integrations/supabase/client";
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

  return (
    <SiteLayout>
      <section className="bg-[var(--surface)] py-8 md:py-12 min-h-[80vh]">
        <div className="container-x">
          <Stepper step={step} />
          <div className="mt-6 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
            <Sidebar pre={pre} onEdit={() => setStep("vehicle")} />
            <div>
              {step === "vehicle" && (
                <VehicleStep
                  pre={pre}
                  onSelect={(card) => { setChosen(card); setStep("details"); }}
                />
              )}
              {step === "details" && chosen && (
                <DetailsStep
                  pre={pre}
                  card={chosen}
                  onBack={() => setStep("vehicle")}
                  onContinue={() => setStep("payment")}
                />
              )}
              {step === "payment" && chosen && (
                <PaymentStep card={chosen} onBack={() => setStep("details")} />
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
function Sidebar({ pre, onEdit }: { pre: Prefill; onEdit: () => void }) {
  return (
    <aside className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold flex items-center gap-2">
            <MapPin className="size-4 text-[var(--gold)]" /> Your Transfer
          </h3>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground">
            <Edit3 className="size-4" />
          </button>
        </div>
        <div className="space-y-4">
          <SidebarRow icon={<MapPin className="size-4" />} label="Pickup" value={pre.pickup || "—"} />
          <SidebarRow icon={<Flag className="size-4" />} label="Dropoff" value={pre.dropoff || "—"} />
          <SidebarRow
            icon={<CalendarDays className="size-4" />}
            label="Date & Time"
            value={pre.date && pre.time ? `${pre.date} ${pre.time}` : "—"}
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3">
        {[
          "10,000+ passengers transferred",
          "Instant confirmation",
          "All-inclusive pricing",
          "Secure payment by credit / debit card",
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
function VehicleStep({ pre, onSelect }: { pre: Prefill; onSelect: (card: QuoteCard) => void }) {
  const quoteFn = useServerFn(calculateQuotes);
  const { data, isLoading, error } = useQuery({
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
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-border bg-[var(--surface)]">
        <h2 className="font-display font-bold">Book Your Ride: {pre.ret ? "Return" : "One Way"}</h2>
        {data && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Estimated distance <span className="font-bold text-foreground">{data.distanceMiles.toFixed(1)} miles</span>
          </p>
        )}
      </div>

      <div className="divide-y divide-border">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground text-sm">Calculating quotes…</div>
        )}
        {error && (
          <div className="p-8 text-center text-sm text-destructive">
            Couldn't load quotes. {(error as Error).message}
          </div>
        )}
        {data?.quotes.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No vehicles match these passenger / luggage requirements.
          </div>
        )}
        {data?.quotes.map((q, i) => (
          <VehicleCard key={q.vehicleId} card={q} best={i === 0} onSelect={() => onSelect(q)} />
        ))}
      </div>
    </div>
  );
}

function VehicleCard({ card, best, onSelect }: { card: QuoteCard; best: boolean; onSelect: () => void }) {
  return (
    <div className="p-5 md:p-6 grid md:grid-cols-[1fr_1.1fr_220px] gap-5 md:gap-6 items-center hover:bg-[var(--surface)]/40 transition">
      {/* image + name */}
      <div>
        {best && (
          <div className="inline-flex items-center gap-1.5 bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-2">
            <Award className="size-3" /> Best Value
          </div>
        )}
        <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
          {card.name}
        </h3>
        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] px-2 py-1 rounded">
          <BadgeCheck className="size-3" /> Private Transfer
        </span>
        <div className="flex gap-0.5 mt-2 text-[var(--gold)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-current" />
          ))}
        </div>
        <img
          src={card.imageUrl}
          alt={card.name}
          className="mt-3 w-full max-w-[240px] aspect-[3/2] object-contain"
          loading="lazy"
        />
      </div>

      {/* features */}
      <ul className="space-y-1.5 text-sm">
        <Feature icon={<Users className="size-4" />}>{card.passengers} Passengers</Feature>
        <Feature icon={<Briefcase className="size-4" />}>{card.luggage} Luggage</Feature>
        <Feature icon={<Luggage className="size-4" />}>{card.handLuggage} Hand Luggage</Feature>
        <Feature icon={<BadgeCheck className="size-4" />}>Meet &amp; Greet Available</Feature>
        <Feature icon={<Clock className="size-4" />}>Free Waiting Time</Feature>
        <Feature icon={<DoorOpen className="size-4" />}>Door to Door</Feature>
        <Feature icon={<UserCheck className="size-4" />}>Experienced Driver</Feature>
      </ul>

      {/* price */}
      <div className="text-right md:border-l md:pl-6 border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Price</p>
        <div className="mt-1">
          <span className="text-2xl font-display font-bold align-top mr-0.5">£</span>
          <span className="text-4xl font-display font-bold tabular-nums">{card.finalPrice.toFixed(2)}</span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
          <p className="flex items-center justify-end gap-1"><ShieldCheck className="size-3 text-[var(--gold)]" /> No hidden cost</p>
          <p className="flex items-center justify-end gap-1"><Clock className="size-3 text-[var(--gold)]" /> Free cancellation</p>
        </div>
        <p className="text-[10px] text-[var(--gold)] mt-1.5 underline">All prices include fees and tolls</p>
        <Button onClick={onSelect} className="mt-3 w-full h-11 rounded-lg bg-[var(--gold)] hover:brightness-110 text-[var(--gold-foreground)] font-bold tracking-wider">
          Book Now £ {card.finalPrice.toFixed(2)}
        </Button>
      </div>
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-foreground/80">
      <span className="text-[var(--gold)]">{icon}</span>
      {children}
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
  pre, card, onBack, onContinue,
}: { pre: Prefill; card: QuoteCard; onBack: () => void; onContinue: () => void }) {
  const [meetGreet, setMeetGreet] = useState(true);
  const [childSeat, setChildSeat] = useState(false);
  const [returnJourney, setReturnJourney] = useState(pre.ret);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = detailsSchema.safeParse(fd);
    if (!parsed.success) { toast.error("Please fill in name, email and phone."); return; }
    setLoading(true);
    const { error } = await supabase.from("bookings").insert({
      customer_name: parsed.data.customer_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pickup_address: pre.pickup,
      dropoff_address: pre.dropoff,
      pickup_date: pre.date,
      pickup_time: pre.time,
      flight_number: parsed.data.flight_number || null,
      passengers: pre.passengers,
      luggage: pre.luggage,
      vehicle_type: card.name,
      child_seat: childSeat,
      meet_greet: meetGreet,
      return_journey: returnJourney,
      notes: parsed.data.notes || null,
      price: card.finalPrice,
    });
    setLoading(false);
    if (error) { toast.error("Couldn't save booking. Try again or call us."); return; }
    toast.success("Booking captured — choose payment next.");
    onContinue();
  };

  return (
    <form onSubmit={onSubmit} className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <img src={card.imageUrl} alt="" className="w-16 h-12 object-contain" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Selected vehicle</p>
          <p className="font-display font-bold">{card.name}</p>
        </div>
        <p className="font-display font-bold text-2xl">£{card.finalPrice.toFixed(2)}</p>
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
function PaymentStep({ card, onBack }: { card: QuoteCard; onBack: () => void }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
      <CheckCircle2 className="size-12 text-[var(--gold)] mx-auto" />
      <h2 className="mt-3 font-display text-2xl font-bold">Booking captured</h2>
      <p className="mt-2 text-muted-foreground">
        We'll confirm shortly by email. Online payment will be enabled once a payment provider is connected.
      </p>
      <div className="mt-6 inline-block bg-[var(--surface)] rounded-xl border border-border px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total to pay</p>
        <p className="font-display text-3xl font-bold mt-1">£{card.finalPrice.toFixed(2)}</p>
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
