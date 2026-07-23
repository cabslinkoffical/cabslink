import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X, Minus, Search, Flag, MapPin, Calendar, Clock, Users, Briefcase, Repeat, Car, Palmtree } from "lucide-react";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

type Tab = "quote" | "hourly";

function encodePlaces(list: SelectedPlace[]): string {
  return list.map((p) => `${p.placeId}::${encodeURIComponent(p.label)}`).join("|");
}

export function BookingWidget() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("quote");
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    (Math.round(now.getMinutes() / 15) * 15) % 60
  ).padStart(2, "0")}`;

  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [stops, setStops] = useState<SelectedPlace[]>([]);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<string>(nowTime);
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState(today);
  const [returnTime, setReturnTime] = useState<string>("12:00");
  const [attempted, setAttempted] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const paxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (paxRef.current && !paxRef.current.contains(e.target as Node)) setPaxOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const missingPlaces = !pickup?.placeId || !dropoff?.placeId;
  const identicalPlaces = !!pickup?.placeId && !!dropoff?.placeId && pickup.placeId === dropoff.placeId;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (missingPlaces || identicalPlaces) return;

    const params = new URLSearchParams();
    params.set("pickupPlaceId", pickup!.placeId);
    params.set("pickupLabel", pickup!.label);
    params.set("dropoffPlaceId", dropoff!.placeId);
    params.set("dropoffLabel", dropoff!.label);
    params.set("date", date);
    params.set("time", time);
    params.set("passengers", String(passengers));
    params.set("luggage", String(luggage));
    params.set("ret", showReturn ? "1" : "0");
    params.set("mode", "quote");
    if (showReturn) {
      params.set("rdate", returnDate);
      params.set("rtime", returnTime);
    }
    const validStops = stops.filter((s) => !!s?.placeId);
    if (validStops.length) params.set("stops", encodePlaces(validStops));
    navigate({ to: "/book", search: { q: params.toString() } as never });
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tabs above the pill */}
      <div className="flex items-center gap-1 mb-3 px-2">
        <TabButton active={tab === "quote"} onClick={() => setTab("quote")} icon={<Car className="w-4 h-4" />}>
          Transfers
        </TabButton>
        <TabButton active={false} onClick={() => navigate({ to: "/tours" })} icon={<Palmtree className="w-4 h-4" />}>
          Day Tours
        </TabButton>
      </div>

      <form onSubmit={submit} noValidate>
        {/* Main horizontal pill */}
        <div className="bg-white rounded-full shadow-[var(--shadow-elegant)] border border-black/5 flex flex-col lg:flex-row lg:items-stretch overflow-visible p-2 lg:p-1.5 gap-2 lg:gap-0">
          {/* Pickup */}
          <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold)]" />} label="From">
            <PlaceAutocomplete
              id="widget-pickup"
              value={pickup}
              onChange={setPickup}
              placeholder="From city, hotel, airport"
              iconClassName="hidden"
              inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
              required
            />
          </FieldCell>

          <Divider />

          {/* Dropoff */}
          <FieldCell icon={<Flag className="w-4 h-4 text-[var(--gold)]" />} label="To">
            <PlaceAutocomplete
              id="widget-dropoff"
              value={dropoff}
              onChange={setDropoff}
              placeholder="To city, hotel, airport"
              iconClassName="hidden"
              inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
              required
            />
          </FieldCell>

          <Divider />

          {/* Date */}
          <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold)]" />} label="Date" compact>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
            />
          </FieldCell>

          <Divider />

          {/* Time */}
          <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Time" compact>
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
            />
          </FieldCell>

          <Divider />

          {/* Passengers + Luggage popover */}
          <div className="relative flex-shrink-0 lg:w-[140px]" ref={paxRef}>
            <button
              type="button"
              onClick={() => setPaxOpen((v) => !v)}
              className="w-full h-full flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-black/[0.03] transition-colors"
            >
              <Users className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <span className="text-sm font-semibold">{passengers}</span>
              <Briefcase className="w-4 h-4 text-[var(--gold)] ml-1 shrink-0" />
              <span className="text-sm font-semibold">{luggage}</span>
            </button>
            {paxOpen && (
              <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white rounded-2xl shadow-[var(--shadow-elegant)] border border-border p-4 space-y-3">
                <StepperRow label="Passengers" value={passengers} min={1} max={16} onChange={setPassengers} />
                <StepperRow label="Luggage" value={luggage} min={0} max={10} onChange={setLuggage} />
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={missingPlaces || identicalPlaces}
            className="group inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-full px-6 lg:px-8 py-3.5 lg:py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs hover:brightness-105 transition-all disabled:opacity-50 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>

        {/* Secondary row: stops / return / multi-city pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 px-2">
          <PillButton icon={<Plus className="w-3 h-3" strokeWidth={3} />} onClick={() => setStops([...stops, { placeId: "", label: "" }])}>
            Add stop
          </PillButton>
          {!showReturn && (
            <PillButton icon={<Repeat className="w-3 h-3" strokeWidth={3} />} onClick={() => setShowReturn(true)}>
              Add return
            </PillButton>
          )}
        </div>

        {/* Stops list (appears when added) */}
        {stops.length > 0 && (
          <div className="mt-3 bg-white rounded-2xl border border-border p-2 space-y-1">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45">Stop {i + 1}</div>
                  <PlaceAutocomplete
                    value={s}
                    onChange={(v) => {
                      const next = [...stops];
                      next[i] = v ?? ({ placeId: "", label: "" } as SelectedPlace);
                      setStops(next);
                    }}
                    placeholder="Add stop"
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 rounded-full bg-[var(--surface)] hover:bg-foreground/10 flex items-center justify-center text-foreground/60 shrink-0"
                  aria-label="Remove stop"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Return journey */}
        {showReturn && (
          <div className="mt-3 bg-white rounded-2xl border border-border p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Return Journey</p>
              <button
                type="button"
                onClick={() => setShowReturn(false)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 px-3 h-[54px] rounded-xl border border-border">
                <Calendar className="w-4 h-4 text-[var(--gold)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45">Date</div>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold" />
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 h-[54px] rounded-xl border border-border">
                <Clock className="w-4 h-4 text-[var(--gold)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45">Time</div>
                  <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold" />
                </div>
              </div>
            </div>
          </div>
        )}

        {attempted && missingPlaces && (
          <p className="text-xs text-destructive text-center mt-3" role="alert">
            Please select pickup and destination from the suggestions.
          </p>
        )}
        {attempted && identicalPlaces && (
          <p className="text-xs text-destructive text-center mt-3" role="alert">
            Pickup and destination cannot be the same location.
          </p>
        )}
      </form>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold font-display tracking-wide transition-colors border-b-2 ${
        active ? "text-white border-[var(--gold)]" : "text-white/60 border-transparent hover:text-white/90"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function FieldCell({ icon, label, children, compact }: { icon: React.ReactNode; label: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 min-w-0 flex-1 ${compact ? "lg:max-w-[150px]" : ""}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</div>
        <div className="[&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:w-full [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative">
          {children}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden lg:block w-px bg-border my-2 shrink-0" />;
}

function StepperRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full bg-[var(--surface)] text-foreground/70 disabled:opacity-40 flex items-center justify-center"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-3 h-3" strokeWidth={3} />
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-full bg-[var(--navy)] text-[var(--gold)] disabled:opacity-40 flex items-center justify-center"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-3 h-3" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function PillButton({ onClick, children, icon }: { onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all backdrop-blur"
    >
      <span className="w-4 h-4 rounded-full bg-[var(--gold)]/25 text-[var(--gold)] flex items-center justify-center">
        {icon}
      </span>
      {children}
    </button>
  );
}
