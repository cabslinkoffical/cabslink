import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Flag, Plus, ArrowLeftRight, X, Minus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/site/AddressAutocomplete";

type Tab = "quote" | "hourly";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = ["00", "15", "30", "45"];
const DURATIONS = ["2", "3", "4", "5", "6", "8", "10", "12"];

export function BookingWidget() {
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
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
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
      passengers: String(passengers),
      luggage: String(luggage),
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

  const tabBase =
    "flex-1 py-4 px-5 rounded-2xl text-left transition-all cursor-pointer";
  const tabActive = "bg-[var(--navy)] text-[var(--gold)] shadow-[var(--shadow-elegant)]";
  const tabIdle = "bg-transparent text-foreground/55 hover:bg-white/60";

  return (
    <div className="w-full max-w-5xl mx-auto bg-card rounded-3xl shadow-[var(--shadow-elegant)] overflow-hidden border border-border">
      {/* Tabs */}
      <div className="flex bg-[var(--surface)] p-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("quote")}
          className={`${tabBase} ${tab === "quote" ? tabActive : tabIdle}`}
        >
          <span className="block text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-0.5">
            Service Type
          </span>
          <span className="block text-base md:text-lg font-bold leading-tight font-display">
            Quick Quote
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("hourly")}
          className={`${tabBase} ${tab === "hourly" ? tabActive : tabIdle}`}
        >
          <span className="block text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-0.5">
            Service Type
          </span>
          <span className="block text-base md:text-lg font-bold leading-tight font-display">
            Hourly Rate
          </span>
        </button>
      </div>

      <form onSubmit={submit} className="p-6 md:p-8 space-y-7">
        {/* Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
          {tab === "quote" && (
            <div className="hidden md:flex absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                <ArrowLeftRight className="w-4 h-4 text-[var(--gold)]" />
              </div>
            </div>
          )}

          <LabeledField label="Pickup Location">
            <FieldShell>
              <AddressAutocomplete
                required
                value={pickup}
                onChange={setPickup}
                placeholder="Enter UK airport, postcode or address"
              />
            </FieldShell>
          </LabeledField>

          {tab === "quote" ? (
            <LabeledField label="Dropoff Destination">
              <FieldShell>
                <AddressAutocomplete
                  required
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="Enter UK destination"
                  iconClassName="hidden"
                />
                <Flag className="absolute left-4 top-[26px] -translate-y-1/2 w-5 h-5 text-[var(--gold)] pointer-events-none" />
              </FieldShell>
            </LabeledField>
          ) : (
            <LabeledField label="Duration">
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-[52px] rounded-xl bg-background border-border px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d} hours</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
          )}
        </div>

        {/* Stops */}
        {stops.length > 0 && (
          <div className="space-y-3">
            {stops.map((s, i) => (
              <LabeledField key={i} label={`Stop ${i + 1}`}>
                <FieldShell>
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--gold)]/70" />
                  <Input
                    value={s}
                    onChange={(e) => {
                      const next = [...stops];
                      next[i] = e.target.value;
                      setStops(next);
                    }}
                    placeholder="Additional stop address"
                    className="border-0 shadow-none bg-transparent pl-12 pr-12 h-[52px] text-sm focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    aria-label="Remove stop"
                    onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--surface)] hover:bg-foreground/10 flex items-center justify-center text-foreground/60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </FieldShell>
              </LabeledField>
            ))}
          </div>
        )}

        {/* Pills */}
        {tab === "quote" && (
          <div className="flex flex-wrap gap-3">
            <PillButton onClick={() => setStops([...stops, ""])}>Add a Stop</PillButton>
            {!showReturn && (
              <PillButton onClick={() => setShowReturn(true)}>Add Return Journey</PillButton>
            )}
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LabeledField label="Date">
            <Input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-[52px] rounded-xl bg-background border-border text-sm font-semibold focus-visible:ring-0 focus-visible:border-[var(--gold)]"
            />
          </LabeledField>

          <LabeledField label="Time">
            <div className="flex items-center gap-2 h-[52px] rounded-xl bg-background border border-border px-3">
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="flex-1 border-0 shadow-none h-10 focus:ring-0 px-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-foreground/30 font-bold">:</span>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="flex-1 border-0 shadow-none h-10 focus:ring-0 px-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </LabeledField>

          <LabeledField label="Passengers">
            <Stepper
              value={passengers}
              min={1}
              max={16}
              onChange={setPassengers}
            />
          </LabeledField>

          <LabeledField label="Luggage">
            <Stepper
              value={luggage}
              min={0}
              max={10}
              onChange={setLuggage}
            />
          </LabeledField>
        </div>

        {/* Return */}
        {showReturn && (
          <div className="rounded-2xl border border-border bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
                Return Journey
              </p>
              <button
                type="button"
                onClick={() => setShowReturn(false)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <LabeledField label="Date">
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="h-[52px] rounded-xl bg-background border-border text-sm font-semibold focus-visible:ring-0 focus-visible:border-[var(--gold)]"
                />
              </LabeledField>
              <LabeledField label="Time">
                <div className="flex items-center gap-2 h-[52px] rounded-xl bg-background border border-border px-3">
                  <Select value={returnHour} onValueChange={setReturnHour}>
                    <SelectTrigger className="flex-1 border-0 shadow-none h-10 focus:ring-0 px-1 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-foreground/30 font-bold">:</span>
                  <Select value={returnMin} onValueChange={setReturnMin}>
                    <SelectTrigger className="flex-1 border-0 shadow-none h-10 focus:ring-0 px-1 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{MINS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </LabeledField>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-5 text-foreground/45 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
              <span className="font-medium">Fixed pricing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
              <span className="font-medium">Wait time included</span>
            </div>
          </div>

          <Button
            type="submit"
            className="group w-full md:w-auto px-10 py-6 h-auto bg-[var(--navy)] text-[var(--gold)] rounded-2xl font-display font-bold uppercase tracking-[0.2em] text-sm hover:-translate-y-0.5 hover:bg-[var(--navy)] transition-all shadow-xl shadow-[var(--navy)]/20"
          >
            Check Availability
            <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-foreground/50 ml-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl bg-background border border-border focus-within:border-[var(--gold)] transition-colors">
      {children}
    </div>
  );
}

function PillButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-xs font-bold text-foreground/70 hover:border-[var(--gold)] hover:text-foreground transition-all"
    >
      <span className="w-4 h-4 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)] transition-colors">
        <Plus className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
      {children}
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center justify-between bg-background border border-border h-[52px] px-3 rounded-xl">
      <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={dec}
          aria-label="Decrease"
          disabled={value <= min}
          className="w-7 h-7 rounded-md bg-[var(--surface)] text-foreground/70 hover:bg-foreground/10 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={inc}
          aria-label="Increase"
          disabled={value >= max}
          className="w-7 h-7 rounded-md bg-[var(--navy)] text-[var(--gold)] hover:brightness-110 disabled:opacity-40 flex items-center justify-center transition"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
