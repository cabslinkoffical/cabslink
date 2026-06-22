import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, Users, Briefcase, Plane, Car, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEHICLE_TYPES } from "@/lib/site";

type Trip = "oneway" | "return" | "hourly";

export function BookingWidget({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip>("oneway");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [vehicle, setVehicle] = useState("Saloon");
  const [flight, setFlight] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      pickup, dropoff, date, time, passengers, luggage,
      vehicle, flight, ret: trip === "return" ? "1" : "0",
    });
    navigate({ to: "/book", search: { q: params.toString() } as never });
  };

  const tabs: { id: Trip; label: string }[] = [
    { id: "oneway", label: "One Way" },
    { id: "return", label: "Return" },
    { id: "hourly", label: "Hourly" },
  ];

  return (
    <form
      onSubmit={submit}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--card)]/95 backdrop-blur-xl text-foreground ${compact ? "p-4 md:p-5" : "p-5 md:p-7 shadow-[var(--shadow-elegant)]"}`}
    >
      {/* gold accent bar */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/60 to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h3 className="font-display text-lg md:text-2xl font-bold leading-tight">Book Your Premium Ride</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[var(--gold)]" /> Fixed fare · Free wait · No hidden fees
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-[var(--navy)]/50 p-1 text-xs font-semibold">
          {tabs.map(t => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTrip(t.id)}
              className={`px-3.5 py-1.5 rounded-full transition uppercase tracking-wider ${trip === t.id ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "text-white/70 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        <Field label="Pickup Location" icon={<MapPin className="size-4" />}>
          <Input required value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Edinburgh Airport (EDI)" />
        </Field>
        <Field label="Drop-off Location" icon={<MapPin className="size-4" />}>
          <Input required value={dropoff} onChange={e => setDropoff(e.target.value)} placeholder="City centre / hotel / postcode" />
        </Field>
        <Field label="Pickup Date" icon={<Calendar className="size-4" />}>
          <Input required type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Pickup Time" icon={<Clock className="size-4" />}>
          <Input required type="time" value={time} onChange={e => setTime(e.target.value)} />
        </Field>
        <Field label="Passengers" icon={<Users className="size-4" />}>
          <Select value={passengers} onValueChange={setPassengers}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 16 }).map((_, i) => (
                <SelectItem key={i} value={String(i + 1)}>{i + 1} {i === 0 ? "Passenger" : "Passengers"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Luggage" icon={<Briefcase className="size-4" />}>
          <Select value={luggage} onValueChange={setLuggage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 11 }).map((_, i) => (
                <SelectItem key={i} value={String(i)}>{i} {i === 1 ? "Bag" : "Bags"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vehicle Type" icon={<Car className="size-4" />}>
          <Select value={vehicle} onValueChange={setVehicle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Flight Number (optional)" icon={<Plane className="size-4" />}>
          <Input value={flight} onChange={e => setFlight(e.target.value)} placeholder="e.g. BA1234" />
        </Field>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Plane className="size-3.5 text-[var(--gold)]" /> Flights tracked automatically · 60 min free wait on airport pickups
        </p>
        <Button type="submit" variant="gold" size="lg" className="rounded-full w-full sm:w-auto">
          Get Instant Quote <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
