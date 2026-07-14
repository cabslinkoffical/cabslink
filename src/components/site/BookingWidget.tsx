import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X, Minus, ArrowRight, Flag, MapPin, Calendar, Clock, Users, Briefcase, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

type Tab = "quote" | "hourly";

const DURATIONS = ["2", "3", "4", "5", "6", "8", "10", "12"];

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
  const [duration, setDuration] = useState("3");
  const [attempted, setAttempted] = useState(false);

  const missingPlaces = !pickup?.placeId || (tab === "quote" && !dropoff?.placeId);
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

  return (
    <div className="w-full max-w-5xl mx-auto bg-card rounded-3xl shadow-[var(--shadow-elegant)] border border-border">
      {/* Segmented tab pill */}
      <div className="p-3 sm:p-4">
        <div className="relative flex bg-[var(--surface)] rounded-full p-1">
          <span
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[var(--navy)] shadow-[var(--shadow-elegant)] transition-transform duration-300 ease-out"
            style={{ transform: tab === "hourly" ? "translateX(100%)" : "translateX(0)" }}
            aria-hidden
          />
          {(["quote", "hourly"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold font-display tracking-wide transition-colors ${
                tab === t ? "text-[var(--gold)]" : "text-foreground/55"
              }`}
            >
              {t === "quote" ? "One Way" : "Hourly"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="px-4 pb-5 sm:px-6 sm:pb-6 md:px-8 md:pb-8 space-y-4" noValidate>
        {/* Route card — stacked pickup/dropoff like a maps app */}
        <div className="rounded-2xl border border-border bg-background">
          <RouteRow
            icon={<MapPin className="w-4 h-4 text-[var(--gold)]" />}
            label="From"
          >
            <PlaceAutocomplete
              id="widget-pickup"
              value={pickup}
              onChange={setPickup}
              placeholder="Pickup address or airport"
              iconClassName="hidden"
              inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-base font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
              required
            />
          </RouteRow>

          {tab === "quote" &&
            stops.map((s, i) => (
              <RouteRow
                key={i}
                icon={<div className="w-2 h-2 rounded-full bg-[var(--gold)]/50" />}
                label={`Stop ${i + 1}`}
                onRemove={() => setStops(stops.filter((_, idx) => idx !== i))}
              >
                <PlaceAutocomplete
                  value={s}
                  onChange={(v) => {
                    const next = [...stops];
                    next[i] = v ?? ({ placeId: "", label: "" } as SelectedPlace);
                    setStops(next);
                  }}
                  placeholder="Add stop"
                  iconClassName="hidden"
                  inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-base font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
                />
              </RouteRow>
            ))}

          {tab === "quote" ? (
            <RouteRow icon={<Flag className="w-4 h-4 text-[var(--gold)]" />} label="To" last>
              <PlaceAutocomplete
                id="widget-dropoff"
                value={dropoff}
                onChange={setDropoff}
                placeholder="Destination"
                iconClassName="hidden"
                inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-base font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
                required
              />
            </RouteRow>
          ) : (
            <RouteRow icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Duration" last>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-base font-semibold focus:ring-0 [&>svg]:ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} hours
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RouteRow>
          )}
        </div>

        {/* Quick actions */}
        {tab === "quote" && (
          <div className="flex flex-wrap gap-2">
            <PillButton icon={<Plus className="w-3 h-3" strokeWidth={3} />} onClick={() => setStops([...stops, { placeId: "", label: "" }])}>
              Add stop
            </PillButton>
            {!showReturn && (
              <PillButton icon={<Repeat className="w-3 h-3" strokeWidth={3} />} onClick={() => setShowReturn(true)}>
                Return journey
              </PillButton>
            )}
          </div>
        )}

        {/* Date + Time as one card */}
        <div className="grid grid-cols-2 gap-3">
          <IconField icon={<Calendar className="w-4 h-4 text-[var(--gold)]" />} label="Date">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
            />
          </IconField>
          <IconField icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Time">
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
            />
          </IconField>
        </div>

        {/* Passengers + luggage steppers */}
        <div className="grid grid-cols-2 gap-3">
          <StepperCard
            icon={<Users className="w-4 h-4 text-[var(--gold)]" />}
            label="Passengers"
            value={passengers}
            min={1}
            max={16}
            onChange={setPassengers}
          />
          <StepperCard
            icon={<Briefcase className="w-4 h-4 text-[var(--gold)]" />}
            label="Luggage"
            value={luggage}
            min={0}
            max={10}
            onChange={setLuggage}
          />
        </div>

        {/* Return journey */}
        {showReturn && (
          <div className="rounded-2xl border border-border bg-[var(--surface)] p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
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
              <IconField icon={<Calendar className="w-4 h-4 text-[var(--gold)]" />} label="Date">
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
                />
              </IconField>
              <IconField icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Time">
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
                />
              </IconField>
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

        {/* CTA — full-width primary on mobile like an app */}
        <Button
          type="submit"
          disabled={missingPlaces || identicalPlaces}
          className="group w-full h-14 bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)] rounded-2xl font-display font-bold uppercase tracking-[0.2em] text-sm shadow-xl shadow-[var(--gold)]/20 hover:brightness-105 transition-all disabled:opacity-50"
        >
          Book Now
          <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-0.5" />
        </Button>

        <div className="flex items-center justify-center gap-4 text-foreground/45 text-[11px] pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" /> Fixed pricing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" /> Wait time included
          </span>
        </div>
      </form>
    </div>
  );
}

function RouteRow({
  icon,
  label,
  children,
  last,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  last?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 ${!last ? "border-b border-border" : ""}`}>
      <div className="w-9 h-9 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="w-7 h-7 rounded-full bg-[var(--surface)] hover:bg-foreground/10 flex items-center justify-center text-foreground/60 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function IconField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 h-[60px] rounded-2xl border border-border bg-background">
      <div className="w-8 h-8 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 truncate">{label}</div>
        <div className="[&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:w-full [&_input::-webkit-calendar-picker-indicator]:h-full [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative">{children}</div>
      </div>
    </div>
  );
}

function StepperCard({
  icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 truncate">{label}</div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - 1))}
            disabled={value <= min}
            aria-label="Decrease"
            className="w-7 h-7 rounded-full bg-[var(--surface)] text-foreground/70 disabled:opacity-40 flex items-center justify-center"
          >
            <Minus className="w-3 h-3" strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(max, value + 1))}
            disabled={value >= max}
            aria-label="Increase"
            className="w-7 h-7 rounded-full bg-[var(--navy)] text-[var(--gold)] disabled:opacity-40 flex items-center justify-center"
          >
            <Plus className="w-3 h-3" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PillButton({
  onClick,
  children,
  icon,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-xs font-bold text-foreground/70 hover:border-[var(--gold)] hover:text-foreground transition-all"
    >
      <span className="w-4 h-4 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center">
        {icon}
      </span>
      {children}
    </button>
  );
}
