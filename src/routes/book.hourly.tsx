import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock, Users, Briefcase, MapPin, CalendarDays, ArrowRight, ArrowLeft,
  CheckCircle2, ShieldCheck, Sparkles, User, Mail, Phone, MessageSquare,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { PhoneInput } from "@/components/site/PhoneInput";
import { calculateHourlyQuotes, createHourlyBooking, type HourlyCard } from "@/lib/hourly.functions";
import { fleetImageFor } from "@/assets/fleet";

export const Route = createFileRoute("/book/hourly")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  head: () => ({
    meta: [
      { title: "Hourly Car & Driver Hire — Book by the Hour | Cabslink" },
      { name: "description", content: "Hire a car with a professional driver by the hour across the UK. Travel as directed with unlimited stops, transparent hourly rates and instant confirmation." },
      { property: "og:title", content: "Hourly Car & Driver Hire — Cabslink" },
      { property: "og:description", content: "Hire a car with a professional driver by the hour across the UK. Travel as directed with unlimited stops and transparent hourly rates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/book/hourly" }],
  }),
  component: HourlyBookPage,
});

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

function parsePrefill(q: string) {
  const p = new URLSearchParams(q || "");
  const today = new Date().toISOString().slice(0, 10);
  const pickupPlaceId = p.get("pickupPlaceId") || "";
  return {
    pickup: pickupPlaceId ? ({ placeId: pickupPlaceId, label: p.get("pickupLabel") || "" } as SelectedPlace) : null,
    date: p.get("date") || today,
    time: p.get("time") || "10:00",
    hours: Math.min(24, Math.max(1, Number(p.get("hours")) || 4)),
    passengers: Math.max(1, Number(p.get("passengers")) || 1),
    luggage: Math.max(0, Number(p.get("luggage")) || 0),
  };
}

function HourlyBookPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const prefill = useMemo(() => parsePrefill(q), [q]);

  const [step, setStep] = useState(1);
  const [pickup, setPickup] = useState<SelectedPlace | null>(prefill.pickup);
  const [date, setDate] = useState(prefill.date);
  const [time, setTime] = useState(prefill.time);
  const [hours, setHours] = useState(prefill.hours);
  const [passengers, setPassengers] = useState(prefill.passengers);
  const [luggage, setLuggage] = useState(prefill.luggage);
  const [selected, setSelected] = useState<HourlyCard | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [notes, setNotes] = useState("");
  const [childSeats, setChildSeats] = useState(0);
  const [meetGreet, setMeetGreet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey] = useState(() => uuid());

  const quotesFn = useServerFn(calculateHourlyQuotes);
  const createFn = useServerFn(createHourlyBooking);

  const quotesQuery = useQuery({
    queryKey: ["hourly-quotes", hours, passengers, luggage],
    queryFn: () => quotesFn({ data: { hours, passengers, luggage } }),
  });

  const quotes = quotesQuery.data?.quotes ?? [];
  const symbol = quotesQuery.data?.currencySymbol ?? "£";
  const childSeatFee = (quotesQuery.data?.childSeatFeePence ?? 0) / 100;
  const meetGreetFee = (quotesQuery.data?.meetGreetFeePence ?? 0) / 100;
  const fits = (c: HourlyCard) => c.passengers >= passengers && c.luggage >= luggage;

  const extrasTotal = childSeats * childSeatFee + (meetGreet ? meetGreetFee : 0);
  const grandTotal = (selected?.total ?? 0) + extrasTotal;

  async function submit() {
    if (!pickup?.placeId || !selected) return;
    if (!name.trim() || !email.trim() || phone.trim().length < 6) {
      toast.error("Please complete your name, email and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createFn({
        data: {
          idempotencyKey: idemKey,
          vehicleId: selected.vehicleId,
          vehicleCount: 1,
          hours,
          pickupPlaceId: pickup.placeId,
          pickupLabel: pickup.label,
          itinerary: itinerary.trim() || null,
          pickupDate: date,
          pickupTime: time,
          passengers,
          luggage,
          customer_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim() || null,
          child_seat_count: childSeats,
          meet_greet: meetGreet,
          cancellation_policy: "standard",
        },
      });
      toast.success(`Booking ${res.ref} received — we'll confirm shortly.`);
      if (res.token) navigate({ to: "/booking/$token", params: { token: res.token } });
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <section className="bg-[var(--navy)] text-white">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">Hourly hire</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mt-3">Car &amp; driver by the hour</h1>
          <p className="mt-3 max-w-2xl text-white/70 text-sm md:text-base">
            Your vehicle and professional driver stay with you for the booked period — travel as directed,
            add as many stops as you need, no per-mile surprises.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-[0.18em]">
          {["Vehicle", "Details", "Review"].map((label, i) => (
            <div key={label} className={`px-3 py-1.5 rounded-full ${step === i + 1 ? "bg-[var(--navy)] text-white" : "bg-[var(--surface)] text-foreground/60"}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div>
            {/* ---------------- Step 1: trip + vehicle ---------------- */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold">Your hire</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Pickup location</Label>
                      <PlaceAutocomplete value={pickup} onChange={setPickup} placeholder="Hotel, address or airport" />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Start time</Label>
                      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Duration</Label>
                      <select
                        value={hours}
                        onChange={(e) => { setHours(Number(e.target.value)); setSelected(null); }}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {Array.from({ length: 22 }, (_, i) => i + 1).map((h) => (
                          <option key={h} value={h}>{h} hour{h === 1 ? "" : "s"}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Passengers</Label>
                        <Input type="number" min={1} max={60} value={passengers} onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))} />
                      </div>
                      <div>
                        <Label className="text-xs">Luggage</Label>
                        <Input type="number" min={0} max={60} value={luggage} onChange={(e) => setLuggage(Math.max(0, Number(e.target.value) || 0))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="font-display text-lg font-bold">Choose your vehicle</h2>
                  {quotesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading hourly rates…</p>}
                  {quotesQuery.isError && <p className="text-sm text-destructive">Couldn't load hourly rates. Please refresh.</p>}
                  {!quotesQuery.isLoading && quotes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No vehicles available for this duration. <Link to="/contact" className="underline">Contact us</Link> for a tailored quote.
                    </p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {quotes.map((c) => {
                      const ok = fits(c);
                      const active = selected?.vehicleId === c.vehicleId;
                      return (
                        <button
                          key={c.vehicleId}
                          type="button"
                          disabled={!ok}
                          onClick={() => setSelected(c)}
                          className={`text-left rounded-2xl border p-4 transition-all ${active ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/30" : "border-border hover:border-foreground/20"} ${ok ? "" : "opacity-45 cursor-not-allowed"}`}
                        >
                          <img src={c.imageUrl || fleetImageFor(c.name)} alt={c.name} loading="lazy" className="w-full h-28 object-contain mb-3" />
                          <div className="font-display font-bold">{c.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.passengers}</span>
                            <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{c.luggage}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />min {c.minHours}h</span>
                          </div>
                          <div className="mt-3 flex items-end justify-between">
                            {c.quoteOnRequest ? (
                              <span className="text-sm font-bold text-[var(--navy)]">Quote on request</span>
                            ) : (
                              <div>
                                <div className="text-xl font-display font-bold text-[var(--navy)]">{symbol}{c.total.toFixed(2)}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {symbol}{c.pricePerHour.toFixed(2)}/hr × {c.chargedHours}h{c.minimumApplied ? " (min)" : ""}
                                </div>
                              </div>
                            )}
                            {!ok && <span className="text-[11px] text-destructive">Too small</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    disabled={!selected || !pickup?.placeId}
                    onClick={() => setStep(2)}
                    className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:brightness-105"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- Step 2: details + extras ---------------- */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold">Your details</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs"><User className="w-3 h-3 inline mr-1" />Full name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <Label className="text-xs"><Mail className="w-3 h-3 inline mr-1" />Email</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs"><Phone className="w-3 h-3 inline mr-1" />Phone</Label>
                      <PhoneInput value={phone} onChange={setPhone} />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs"><MessageSquare className="w-3 h-3 inline mr-1" />Planned itinerary (optional)</Label>
                      <Textarea value={itinerary} onChange={(e) => setItinerary(e.target.value)} placeholder="e.g. Hotel → Stirling Castle → Loch Lomond → Glasgow" rows={3} />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Notes for your driver (optional)</Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold">Extras</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Child seats</div>
                      <div className="text-xs text-muted-foreground">{symbol}{childSeatFee.toFixed(2)} each</div>
                    </div>
                    <Input type="number" min={0} max={10} value={childSeats} onChange={(e) => setChildSeats(Math.max(0, Number(e.target.value) || 0))} className="w-20" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Meet &amp; greet</div>
                      <div className="text-xs text-muted-foreground">{symbol}{meetGreetFee.toFixed(2)}</div>
                    </div>
                    <Switch checked={meetGreet} onCheckedChange={setMeetGreet} />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={() => setStep(3)} className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:brightness-105">
                    Review <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- Step 3: review ---------------- */}
            {step === 3 && selected && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-3">
                  <h2 className="font-display text-lg font-bold">Review &amp; confirm</h2>
                  <Row icon={<MapPin className="w-4 h-4" />} label="Pickup" value={pickup?.label || "—"} />
                  <Row icon={<CalendarDays className="w-4 h-4" />} label="Start" value={`${date} at ${time}`} />
                  <Row icon={<Clock className="w-4 h-4" />} label="Duration" value={`${selected.chargedHours} hours`} />
                  <Row icon={<Sparkles className="w-4 h-4" />} label="Vehicle" value={selected.name} />
                  <Row icon={<Users className="w-4 h-4" />} label="Party" value={`${passengers} passenger(s), ${luggage} bag(s)`} />
                  {itinerary && <Row icon={<MessageSquare className="w-4 h-4" />} label="Itinerary" value={itinerary} />}
                </div>

                <div className="rounded-2xl border border-border bg-[var(--surface)] p-4 text-sm text-muted-foreground flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-[var(--gold)] shrink-0" />
                  <p>
                    Additional hours beyond the booked period are charged at {symbol}{selected.pricePerHour.toFixed(2)} per hour.
                    Free cancellation up to 24 hours before pickup — see our{" "}
                    <Link to="/booking-policy" className="underline">booking policy</Link>.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button disabled={submitting} onClick={submit} className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:brightness-105">
                    {submitting ? "Sending…" : "Confirm booking"} <CheckCircle2 className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ---------------- Summary sidebar ---------------- */}
          <aside className="hidden lg:block sticky top-28 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-bold text-sm uppercase tracking-[0.18em] text-[var(--navy)]">Trip summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              <SummaryLine label="Hourly hire" value={selected ? `${selected.chargedHours} h` : `${hours} h`} />
              <SummaryLine label="Vehicle" value={selected?.name ?? "Not selected"} />
              <SummaryLine label="Base" value={selected ? `${symbol}${selected.total.toFixed(2)}` : "—"} />
              {childSeats > 0 && <SummaryLine label={`Child seats × ${childSeats}`} value={`${symbol}${(childSeats * childSeatFee).toFixed(2)}`} />}
              {meetGreet && <SummaryLine label="Meet & greet" value={`${symbol}${meetGreetFee.toFixed(2)}`} />}
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                <span className="font-bold">Total</span>
                <span className="font-display text-xl font-bold text-[var(--navy)]">
                  {selected ? `${symbol}${grandTotal.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Mobile total bar */}
      {selected && (
        <div className="lg:hidden sticky bottom-0 z-40 bg-white border-t border-border px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</div>
            <div className="font-display text-lg font-bold text-[var(--navy)]">{symbol}{grandTotal.toFixed(2)}</div>
          </div>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="bg-[var(--gold)] text-[var(--gold-foreground)]">Continue</Button>
          ) : (
            <Button disabled={submitting} onClick={submit} className="bg-[var(--gold)] text-[var(--gold-foreground)]">
              {submitting ? "Sending…" : "Confirm"}
            </Button>
          )}
        </div>
      )}
    </SiteLayout>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-[var(--gold)] mt-0.5">{icon}</span>
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
