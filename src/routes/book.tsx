import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Calendar, Clock, MapPin, Plane, Users, Briefcase, Car, User, Mail, Phone, MessageSquare } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { VEHICLE_TYPES } from "@/lib/site";

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  head: () => ({
    meta: [
      { title: "Book Now — Cabslink UK Airport Transfer & Chauffeur" },
      { name: "description", content: "Book a premium UK airport transfer or chauffeur with Cabslink. Quick, secure booking with 24/7 confirmation." },
      { property: "og:title", content: "Book your ride — Cabslink" },
      { property: "og:url", content: "/book" },
    ],
    links: [{ rel: "canonical", href: "/book" }],
  }),
  component: BookPage,
});

const schema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  pickup_address: z.string().trim().min(3).max(255),
  dropoff_address: z.string().trim().min(3).max(255),
  pickup_date: z.string().min(1),
  pickup_time: z.string().min(1),
  flight_number: z.string().trim().max(20).optional().or(z.literal("")),
  passengers: z.coerce.number().int().min(1).max(20),
  luggage: z.coerce.number().int().min(0).max(20),
  vehicle_type: z.string().min(1),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function readPrefill(q: string) {
  const p = new URLSearchParams(q);
  return {
    pickup: p.get("pickup") ?? "",
    dropoff: p.get("dropoff") ?? "",
    date: p.get("date") ?? "",
    time: p.get("time") ?? "",
    passengers: p.get("passengers") ?? "1",
    luggage: p.get("luggage") ?? "0",
    vehicle: p.get("vehicle") ?? "Saloon",
    flight: p.get("flight") ?? "",
    ret: p.get("ret") === "1",
  };
}

function BookPage() {
  const { q } = Route.useSearch();
  const pre = readPrefill(q);
  const [vehicle, setVehicle] = useState(pre.vehicle);
  const [passengers, setPassengers] = useState(pre.passengers);
  const [luggage, setLuggage] = useState(pre.luggage);
  const [childSeat, setChildSeat] = useState(false);
  const [meetGreet, setMeetGreet] = useState(true);
  const [returnJourney, setReturnJourney] = useState(pre.ret);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const data = { ...fd, passengers, luggage, vehicle_type: vehicle };
    const parsed = schema.safeParse(data);
    if (!parsed.success) { toast.error("Please complete all required fields."); return; }
    setLoading(true);
    const { data: row, error } = await supabase.from("bookings").insert({
      customer_name: parsed.data.customer_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pickup_address: parsed.data.pickup_address,
      dropoff_address: parsed.data.dropoff_address,
      pickup_date: parsed.data.pickup_date,
      pickup_time: parsed.data.pickup_time,
      flight_number: parsed.data.flight_number || null,
      passengers: parsed.data.passengers,
      luggage: parsed.data.luggage,
      vehicle_type: parsed.data.vehicle_type,
      child_seat: childSeat,
      meet_greet: meetGreet,
      return_journey: returnJourney,
      notes: parsed.data.notes || null,
    }).select("id").single();
    setLoading(false);
    if (error || !row) { toast.error("Could not submit booking. Please try again or call us."); return; }
    setSuccess(row.id);
    toast.success("Booking request received!");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (success) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Booking Received"
          title="Thank you — your ride is being arranged."
          subtitle="A member of our team will confirm your booking by email shortly. For urgent changes, call our 24/7 line."
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Book Now" }]}
        />
        <section className="section-y">
          <div className="container-x max-w-2xl text-center">
            <div className="rounded-3xl border border-border bg-card p-10 shadow-[var(--shadow-elegant)]">
              <CheckCircle2 className="size-14 text-[var(--gold)] mx-auto" />
              <h2 className="mt-4 font-display text-3xl font-semibold">Booking confirmed in our system</h2>
              <p className="mt-3 text-muted-foreground">Reference: <span className="font-mono text-foreground">{success.slice(0, 8).toUpperCase()}</span></p>
              <p className="mt-2 text-sm text-muted-foreground">You'll receive an email confirmation shortly. Need to amend? Reply to that email or call us.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild variant="gold" className="rounded-full"><a href="/">Back to home</a></Button>
                <Button asChild variant="outline" className="rounded-full"><a href="/contact">Contact us</a></Button>
              </div>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Book Now"
        title="Book your premium UK transfer."
        subtitle="Fill in your details and we'll confirm your ride. Quick, secure and 24/7."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Book Now" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-3 gap-8">
          <form onSubmit={onSubmit} className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 md:p-10 shadow-sm space-y-8">
            <FormBlock title="Your details">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name" icon={<User className="size-4" />}><Input name="customer_name" required maxLength={100} /></Field>
                <Field label="Phone" icon={<Phone className="size-4" />}><Input name="phone" required maxLength={30} /></Field>
              </div>
              <Field label="Email" icon={<Mail className="size-4" />}><Input name="email" type="email" required maxLength={255} /></Field>
            </FormBlock>

            <FormBlock title="Journey details">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Pickup address" icon={<MapPin className="size-4" />}><Input name="pickup_address" required defaultValue={pre.pickup} maxLength={255} placeholder="Airport, hotel, postcode…" /></Field>
                <Field label="Drop-off address" icon={<MapPin className="size-4" />}><Input name="dropoff_address" required defaultValue={pre.dropoff} maxLength={255} placeholder="Destination" /></Field>
                <Field label="Pickup date" icon={<Calendar className="size-4" />}><Input name="pickup_date" type="date" required defaultValue={pre.date} /></Field>
                <Field label="Pickup time" icon={<Clock className="size-4" />}><Input name="pickup_time" type="time" required defaultValue={pre.time} /></Field>
                <Field label="Flight number (optional)" icon={<Plane className="size-4" />}><Input name="flight_number" defaultValue={pre.flight} maxLength={20} placeholder="e.g. BA1234" /></Field>
                <Field label="Vehicle type" icon={<Car className="size-4" />}>
                  <Select value={vehicle} onValueChange={setVehicle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Passengers" icon={<Users className="size-4" />}>
                  <Select value={passengers} onValueChange={setPassengers}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({length: 16}).map((_, i) => <SelectItem key={i} value={String(i+1)}>{i+1}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Luggage" icon={<Briefcase className="size-4" />}>
                  <Select value={luggage} onValueChange={setLuggage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({length: 11}).map((_, i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </FormBlock>

            <FormBlock title="Add-ons">
              <div className="grid sm:grid-cols-3 gap-3">
                <Toggle label="Meet & greet" checked={meetGreet} onChange={setMeetGreet} />
                <Toggle label="Child seat" checked={childSeat} onChange={setChildSeat} />
                <Toggle label="Return journey" checked={returnJourney} onChange={setReturnJourney} />
              </div>
            </FormBlock>

            <FormBlock title="Special requests">
              <Field label="Notes (optional)" icon={<MessageSquare className="size-4" />}>
                <Textarea name="notes" rows={4} maxLength={1000} placeholder="Anything our chauffeur should know" />
              </Field>
            </FormBlock>

            <Button type="submit" variant="gold" size="lg" disabled={loading} className="w-full rounded-full">
              {loading ? "Submitting…" : <>Submit booking request <ArrowRight className="size-4" /></>}
            </Button>
          </form>

          <aside className="space-y-5 h-fit lg:sticky lg:top-24">
            <div className="rounded-3xl bg-[var(--navy)] text-white p-7">
              <h3 className="font-display text-2xl">Why Cabslink</h3>
              <ul className="mt-5 space-y-3 text-sm text-white/80">
                {["Free 60-min wait time on airport pickups", "Live flight tracking included", "Fixed transparent fares", "24/7 dispatch support", "Vetted, professional chauffeurs"].map(i => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-card p-7">
              <h3 className="font-display text-xl font-semibold">Need help?</h3>
              <p className="text-sm text-muted-foreground mt-1">Call us 24/7 and we'll book the ride for you.</p>
              <Button asChild variant="outline" className="mt-4 w-full rounded-full"><a href="tel:+443338882991">Call +44 333 888 2991</a></Button>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function FormBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-xl font-semibold mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">{icon}{label}</Label>
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
