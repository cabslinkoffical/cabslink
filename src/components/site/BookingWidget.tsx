import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, Users, Briefcase, Plane, Car, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VEHICLE_TYPES } from "@/lib/site";

export function BookingWidget({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [vehicle, setVehicle] = useState("Saloon");
  const [flight, setFlight] = useState("");
  const [returnJourney, setReturnJourney] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      pickup, dropoff, date, time, passengers, luggage,
      vehicle, flight, ret: returnJourney ? "1" : "0",
    });
    navigate({ to: "/book", search: { q: params.toString() } as never });
  };

  return (
    <form onSubmit={submit} className={`glass-card rounded-3xl p-5 md:p-7 text-foreground ${compact ? "" : "shadow-[var(--shadow-elegant)]"}`}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display text-xl md:text-2xl font-semibold">Get an Instant Quote</h3>
          <p className="text-xs text-muted-foreground">Book in under 60 seconds · No hidden fees</p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
          <Plane className="size-3" /> Flight tracked
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={returnJourney} onCheckedChange={setReturnJourney} />
          <span className="text-sm">Add return journey</span>
        </Label>
        <Button type="submit" variant="gold" size="lg" className="rounded-full">
          Get Quote / Book Now <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
