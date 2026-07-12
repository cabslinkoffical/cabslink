import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, ArrowLeftRight, X, Minus, ArrowRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

type Tab = "quote" | "hourly";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINS = ["00", "15", "30", "45"];
const DURATIONS = ["2", "3", "4", "5", "6", "8", "10", "12"];

function to12(t: string): { h: string; m: string; p: "AM" | "PM" } {
  const [hRaw, mRaw] = (t || "12:00").split(":");
  let h = parseInt(hRaw, 10);
  const m = (mRaw ?? "00").padStart(2, "0");
  const p: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { h: String(h), m, p };
}
function to24(h: string, m: string, p: "AM" | "PM"): string {
  let hn = parseInt(h, 10) % 12;
  if (p === "PM") hn += 12;
  return `${String(hn).padStart(2, "0")}:${m}`;
}

function encodePlaces(list: SelectedPlace[]): string {
  return list.map((p) => `${p.placeId}::${encodeURIComponent(p.label)}`).join("|");
}

export function BookingWidget() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("quote");
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [stops, setStops] = useState<SelectedPlace[]>([]);
  const [date, setDate] = useState(today);
  const roundedMin = String((Math.round(now.getMinutes() / 15) * 15) % 60).padStart(2, "0");
  const initHour = to12(`${String(now.getHours()).padStart(2, "0")}:${roundedMin}`);
  const [time, setTime] = useState<string>(to24(initHour.h, initHour.m, initHour.p));
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState(today);
  const [returnTime, setReturnTime] = useState<string>("12:00");
  const [duration, setDuration] = useState("3");
  const [attempted, setAttempted] = useState(false);

  const missingPlaces =
    !pickup?.placeId || (tab === "quote" && !dropoff?.placeId);
  const identicalPlaces =
    tab === "quote" &&
    !!pickup?.placeId &&
    !!dropoff?.placeId &&
    pickup.placeId === dropoff.placeId;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (missingPlaces || identicalPlaces) return;

    const params = new URLSearchParams();
    params.set("pickupPlaceId", pickup!.placeId);
    params.set("pickupLabel", pickup!.label);
    if (tab === "quote") {
      params.set("dropoffPlaceId", dropoff!.placeId);
      params.set("dropoffLabel", dropoff!.label);
    }
    params.set("date", date);
    params.set("time", time);
    params.set("passengers", String(passengers));
    params.set("luggage", String(luggage));
    params.set("ret", showReturn ? "1" : "0");
    params.set("mode", tab);
    if (tab === "hourly") params.set("duration", duration);
    if (showReturn) {
      params.set("rdate", returnDate);
      params.set("rtime", returnTime);
    }
    const validStops = stops.filter((s) => !!s?.placeId);
    if (validStops.length) params.set("stops", encodePlaces(validStops));
    navigate({ to: "/book", search: { q: params.toString() } as never });
  };

  const tabBase = "flex-1 min-w-0 py-3 px-3 sm:py-4 sm:px-5 rounded-2xl text-center sm:text-left transition-all cursor-pointer";
  const tabActive = "bg-[var(--navy)] text-[var(--gold)] shadow-[var(--shadow-elegant)]";
  const tabIdle = "bg-transparent text-foreground/55 hover:bg-white/60";

  return (
    <div className="w-full max-w-5xl mx-auto bg-card rounded-3xl shadow-[var(--shadow-elegant)] overflow-hidden border border-border">
      <div className="flex bg-[var(--surface)] p-1.5 sm:p-2 gap-1.5 sm:gap-2">
        <button type="button" onClick={() => setTab("quote")} className={`${tabBase} ${tab === "quote" ? tabActive : tabIdle}`}>
          <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-0.5">Service Type</span>
          <span className="block text-sm sm:text-base md:text-lg font-bold leading-tight font-display truncate">Quick Quote</span>
        </button>
        <button type="button" onClick={() => setTab("hourly")} className={`${tabBase} ${tab === "hourly" ? tabActive : tabIdle}`}>
          <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-0.5">Service Type</span>
          <span className="block text-sm sm:text-base md:text-lg font-bold leading-tight font-display truncate">Hourly Rate</span>
        </button>
      </div>

      <form onSubmit={submit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-7" noValidate>
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
              <PlaceAutocomplete
                id="widget-pickup"
                value={pickup}
                onChange={setPickup}
                placeholder="Enter UK airport, postcode or address"
                inputClassName="border-0 shadow-none bg-transparent focus-visible:ring-0"
                required
              />
            </FieldShell>
          </LabeledField>

          {tab === "quote" ? (
            <LabeledField label="Dropoff Destination">
              <FieldShell>
                <PlaceAutocomplete
                  id="widget-dropoff"
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="Enter UK destination"
                  iconClassName="hidden"
                  inputClassName="border-0 shadow-none bg-transparent pl-11 focus-visible:ring-0"
                  required
                />
                <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gold)] pointer-events-none z-10" />
              </FieldShell>
            </LabeledField>
          ) : (
            <LabeledField label="Duration">
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-[52px] rounded-xl bg-background border-border px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (<SelectItem key={d} value={d}>{d} hours</SelectItem>))}
                </SelectContent>
              </Select>
            </LabeledField>
          )}
        </div>

        {stops.length > 0 && (
          <div className="space-y-3">
            {stops.map((s, i) => (
              <LabeledField key={i} label={`Stop ${i + 1}`}>
                <FieldShell>
                  <PlaceAutocomplete
                    value={s}
                    onChange={(v) => {
                      const next = [...stops];
                      next[i] = v ?? ({ placeId: "", label: "" } as SelectedPlace);
                      setStops(next);
                    }}
                    placeholder="Additional UK stop address"
                    iconClassName="text-[var(--gold)]/70"
                    inputClassName="border-0 shadow-none bg-transparent focus-visible:ring-0 pr-12"
                  />
                  <button
                    type="button"
                    aria-label="Remove stop"
                    onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--surface)] hover:bg-foreground/10 flex items-center justify-center text-foreground/60 z-20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </FieldShell>
              </LabeledField>
            ))}
          </div>
        )}

        {tab === "quote" && (
          <div className="flex flex-wrap gap-3">
            <PillButton onClick={() => setStops([...stops, { placeId: "", label: "" }])}>Add a Stop</PillButton>
            {!showReturn && (<PillButton onClick={() => setShowReturn(true)}>Add Return Journey</PillButton>)}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LabeledField label="Date">
            <Input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-[52px] rounded-xl bg-background border-border text-sm font-semibold focus-visible:ring-0 focus-visible:border-[var(--gold)]" />
          </LabeledField>
          <LabeledField label="Time"><TimePicker12 value={time} onChange={setTime} /></LabeledField>
          <LabeledField label="Passengers"><Stepper value={passengers} min={1} max={16} onChange={setPassengers} /></LabeledField>
          <LabeledField label="Luggage"><Stepper value={luggage} min={0} max={10} onChange={setLuggage} /></LabeledField>
        </div>

        {showReturn && (
          <div className="rounded-2xl border border-border bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Return Journey</p>
              <button type="button" onClick={() => setShowReturn(false)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <LabeledField label="Date">
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                  className="h-[52px] rounded-xl bg-background border-border text-sm font-semibold focus-visible:ring-0 focus-visible:border-[var(--gold)]" />
              </LabeledField>
              <LabeledField label="Time"><TimePicker12 value={returnTime} onChange={setReturnTime} /></LabeledField>
            </div>
          </div>
        )}

        {attempted && missingPlaces && (
          <p className="text-xs text-destructive text-center" role="alert">
            Please select {tab === "quote" ? "pickup and destination" : "pickup"} from the suggestions.
          </p>
        )}
        {attempted && identicalPlaces && (
          <p className="text-xs text-destructive text-center" role="alert">
            Pickup and destination cannot be the same location.
          </p>
        )}

        <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-5 text-foreground/45 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" /><span className="font-medium">Fixed pricing</span></div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" /><span className="font-medium">Wait time included</span></div>
          </div>

          <Button
            type="submit"
            disabled={missingPlaces || identicalPlaces}
            className="group w-full md:w-auto px-10 py-6 h-auto bg-[var(--navy)] text-[var(--gold)] rounded-2xl font-display font-bold uppercase tracking-[0.2em] text-sm hover:-translate-y-0.5 hover:bg-[var(--navy)] transition-all shadow-xl shadow-[var(--navy)]/20"
          >
            Get a Quote
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
      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-foreground/50 ml-1">{label}</label>
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
    <button type="button" onClick={onClick} className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-xs font-bold text-foreground/70 hover:border-[var(--gold)] hover:text-foreground transition-all">
      <span className="w-4 h-4 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)] transition-colors">
        <Plus className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
      {children}
    </button>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center justify-between bg-background border border-border h-[52px] px-3 rounded-xl">
      <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
      <div className="flex gap-1.5">
        <button type="button" onClick={dec} aria-label="Decrease" disabled={value <= min}
          className="w-7 h-7 rounded-md bg-[var(--surface)] text-foreground/70 hover:bg-foreground/10 disabled:opacity-40 flex items-center justify-center transition-colors">
          <Minus className="w-3 h-3" />
        </button>
        <button type="button" onClick={inc} aria-label="Increase" disabled={value >= max}
          className="w-7 h-7 rounded-md bg-[var(--navy)] text-[var(--gold)] hover:brightness-110 disabled:opacity-40 flex items-center justify-center transition">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function TimePicker12({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { h, m, p } = to12(value);
  const setH = (nh: string) => onChange(to24(nh, m, p));
  const setM = (nm: string) => onChange(to24(h, nm, p));
  const setP = (np: "AM" | "PM") => onChange(to24(h, m, np));
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 h-[52px] rounded-xl bg-background border border-border px-1 sm:px-1.5 min-w-0 overflow-hidden">
      <Select value={h} onValueChange={setH}>
        <SelectTrigger className="w-[42px] sm:w-[60px] border-0 shadow-none h-10 focus:ring-0 px-1 sm:px-1.5 font-semibold tabular-nums text-sm shrink-0 [&>svg]:hidden sm:[&>svg]:block"><SelectValue /></SelectTrigger>
        <SelectContent>{HOURS_12.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
      </Select>
      <span className="text-foreground/30 font-bold text-xs sm:text-sm shrink-0">:</span>
      <Select value={m} onValueChange={setM}>
        <SelectTrigger className="w-[42px] sm:w-[60px] border-0 shadow-none h-10 focus:ring-0 px-1 sm:px-1.5 font-semibold tabular-nums text-sm shrink-0 [&>svg]:hidden sm:[&>svg]:block"><SelectValue /></SelectTrigger>
        <SelectContent>{MINS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
      </Select>
      <div className="ml-auto flex rounded-lg bg-[var(--surface)] p-0.5 shrink-0">
        {(["AM", "PM"] as const).map((opt) => (
          <button key={opt} type="button" onClick={() => setP(opt)}
            className={`px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide transition-colors ${p === opt ? "bg-[var(--navy)] text-[var(--gold)] shadow-sm" : "text-foreground/60 hover:text-foreground"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
