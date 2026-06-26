import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Flag, Calendar, Clock, Users, Briefcase, Plus, Route as RouteIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "quote" | "hourly";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const DURATIONS = ["2", "3", "4", "5", "6", "8", "10", "12"];

export function BookingWidget({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("quote");
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState(String(now.getHours()).padStart(2, "0"));
  const [minute, setMinute] = useState("00");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState(today);
  const [returnHour, setReturnHour] = useState("12");
  const [returnMin, setReturnMin] = useState("00");
  const [duration, setDuration] = useState("3");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      pickup,
      dropoff: tab === "hourly" ? "" : dropoff,
      date,
      time: `${hour}:${minute}`,
      passengers,
      luggage,
      vehicle: "Mercedes-Benz V-Class",
      flight: "",
      ret: showReturn ? "1" : "0",
      mode: tab,
      ...(tab === "hourly" ? { duration } : {}),
      ...(showReturn ? { rdate: returnDate, rtime: `${returnHour}:${returnMin}` } : {}),
      ...(stops.length ? { stops: stops.join("|") } : {}),
    });
    navigate({ to: "/book", search: { q: params.toString() } as never });
  };

  return (
    <div className={`w-full ${compact ? "" : ""}`}>
      {/* Tabs */}
      <div className="flex gap-0">
        <button
          type="button"
          onClick={() => setTab("quote")}
          className={`flex-1 px-5 py-3 text-sm font-bold uppercase tracking-wider rounded-t-lg transition ${
            tab === "quote"
              ? "bg-[var(--gold)] text-[var(--gold-foreground)]"
              : "bg-[var(--navy)]/85 text-white/80 hover:bg-[var(--navy)]"
          }`}
        >
          Get Quick Quote
        </button>
        <button
          type="button"
          onClick={() => setTab("hourly")}
          className={`flex-1 px-5 py-3 text-sm font-bold uppercase tracking-wider rounded-t-lg transition ${
            tab === "hourly"
              ? "bg-[var(--gold)] text-[var(--gold-foreground)]"
              : "bg-[var(--navy)]/85 text-white/80 hover:bg-[var(--navy)]"

          }`}
        >
          Hourly Rate
        </button>
      </div>

      <form
        onSubmit={submit}
        className="bg-card text-card-foreground rounded-b-lg rounded-tr-lg p-5 md:p-6 shadow-[var(--shadow-elegant)] space-y-3.5"
      >
        <div className="flex items-center gap-2 pb-1">
          <RouteIcon className="size-5 text-[var(--gold)]" />
          <h3 className="font-display text-lg font-bold text-foreground/80">
            {tab === "hourly" ? "Hourly Booking" : "Outbound Journey"}
          </h3>
        </div>

        <IconField icon={<MapPin className="size-5" />}>
          <Input
            required
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Enter Pickup Airport, Location or Postcode"
            className="border-0 shadow-none h-12 text-sm focus-visible:ring-0"
          />
        </IconField>

        {stops.map((s, i) => (
          <IconField key={i} icon={<MapPin className="size-5" />}>
            <Input
              value={s}
              onChange={(e) => {
                const next = [...stops];
                next[i] = e.target.value;
                setStops(next);
              }}
              placeholder={`Stop ${i + 1}`}
              className="border-0 shadow-none h-12 text-sm focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
              className="px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </IconField>
        ))}

        {tab === "quote" && (
          <IconField icon={<Flag className="size-5" />}>
            <Input
              required
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder="Enter Dropoff Airport, Location or Postcode"
              className="border-0 shadow-none h-12 text-sm focus-visible:ring-0"
            />
          </IconField>
        )}

        <IconField icon={<Calendar className="size-5" />}>
          <Input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-0 shadow-none h-12 text-sm focus-visible:ring-0"
          />
        </IconField>

        <IconField icon={<Clock className="size-5" />}>
          <div className="flex-1 flex items-center gap-2 px-3">
            <Select value={hour} onValueChange={setHour}>
              <SelectTrigger className="flex-1 border-0 shadow-none h-12 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-foreground/40 font-bold">:</span>
            <Select value={minute} onValueChange={setMinute}>
              <SelectTrigger className="flex-1 border-0 shadow-none h-12 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </IconField>

        {tab === "hourly" && (
          <div>
            <Label icon={<Clock className="size-4" />}>Duration (hours)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d} hours</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <Label icon={<Users className="size-4" />}>Passengers</Label>
            <Select value={passengers} onValueChange={setPassengers}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 16 }).map((_, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {i + 1} {i === 0 ? "Passenger" : "Passengers"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label icon={<Briefcase className="size-4" />}>Luggages</Label>
            <Select value={luggage} onValueChange={setLuggage}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }).map((_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i} {i === 1 ? "Luggage" : "Luggages"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showReturn && (
          <div className="rounded-lg border border-border bg-[var(--surface)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">Return Journey</p>
              <button
                type="button"
                onClick={() => setShowReturn(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </div>
            <IconField icon={<Calendar className="size-5" />}>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="border-0 shadow-none h-12 text-sm focus-visible:ring-0"
              />
            </IconField>
            <IconField icon={<Clock className="size-5" />}>
              <div className="flex-1 flex items-center gap-2 px-3">
                <Select value={returnHour} onValueChange={setReturnHour}>
                  <SelectTrigger className="flex-1 border-0 shadow-none h-12 focus:ring-0"><SelectValue /></SelectTrigger>
                  <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-foreground/40 font-bold">:</span>
                <Select value={returnMin} onValueChange={setReturnMin}>
                  <SelectTrigger className="flex-1 border-0 shadow-none h-12 focus:ring-0"><SelectValue /></SelectTrigger>
                  <SelectContent>{MINS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </IconField>
          </div>
        )}

        {tab === "quote" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStops([...stops, ""])}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/5 text-[var(--gold)] hover:bg-[var(--gold)]/10 px-4 py-2 text-xs font-semibold transition"
            >
              <Plus className="size-3.5" /> Add Stop
            </button>
            {!showReturn && (
              <button
                type="button"
                onClick={() => setShowReturn(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/5 text-[var(--gold)] hover:bg-[var(--gold)]/10 px-4 py-2 text-xs font-semibold transition"
              >
                <Plus className="size-3.5" /> Add Return Journey
              </button>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-14 rounded-lg text-base font-bold uppercase tracking-[0.18em] bg-[var(--gold)] hover:brightness-110 text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]"
        >
          Quote & Book <ArrowRight className="size-4 ml-1" />
        </Button>

      </form>
    </div>
  );
}

function IconField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-stretch rounded-lg border border-border bg-background overflow-hidden focus-within:border-[var(--gold)] transition">
      <div className="flex items-center justify-center w-12 bg-[var(--gold)] text-[var(--gold-foreground)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  );
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-1.5 flex items-center gap-1.5">
      {icon} {children}
    </p>
  );
}
