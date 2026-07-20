import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, Flag, Search } from "lucide-react";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

/**
 * Compact single-row hero booking bar inspired by luxury-transfer sites.
 * On desktop it renders as one pill: Date | Time | Pickup | Dropoff | Search.
 * On mobile it stacks the fields and keeps a full-width CTA.
 */
export function HeroBookingBar() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    (Math.round(now.getMinutes() / 15) * 15) % 60
  ).padStart(2, "0")}`;

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(defaultTime);
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [attempted, setAttempted] = useState(false);

  const missing = !pickup?.placeId || !dropoff?.placeId;
  const identical =
    !!pickup?.placeId && !!dropoff?.placeId && pickup.placeId === dropoff.placeId;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (missing || identical) return;
    const params = new URLSearchParams();
    params.set("pickupPlaceId", pickup!.placeId);
    params.set("pickupLabel", pickup!.label);
    params.set("dropoffPlaceId", dropoff!.placeId);
    params.set("dropoffLabel", dropoff!.label);
    params.set("date", date);
    params.set("time", time);
    params.set("mode", "quote");
    navigate({ to: "/book", search: { q: params.toString() } as never });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="w-full max-w-5xl mx-auto"
      aria-label="Quick booking"
    >
      {/* Pill container */}
      <div className="rounded-[2rem] md:rounded-full bg-card border border-border shadow-[var(--shadow-elegant)] p-2 md:pl-3 md:pr-2 md:py-2">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr_1.4fr_auto] gap-1.5 md:gap-0 md:divide-x md:divide-border/70">
          {/* Date */}
          <Field icon={<Calendar className="size-4 text-[var(--gold)]" />} label="Select Date">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
            />
          </Field>
          {/* Time */}
          <Field icon={<Clock className="size-4 text-[var(--gold)]" />} label="Select Time">
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
            />
          </Field>
          {/* Pickup */}
          <Field icon={<MapPin className="size-4 text-[var(--gold)]" />} label="Pick-Up Location">
            <PlaceAutocomplete
              id="hero-pickup"
              value={pickup}
              onChange={setPickup}
              placeholder="Enter pickup"
              iconClassName="hidden"
              inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
              required
            />
          </Field>
          {/* Dropoff */}
          <Field icon={<Flag className="size-4 text-[var(--gold)]" />} label="Drop-Off Location">
            <PlaceAutocomplete
              id="hero-dropoff"
              value={dropoff}
              onChange={setDropoff}
              placeholder="Enter destination"
              iconClassName="hidden"
              inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-foreground/40"
              required
            />
          </Field>
          {/* CTA */}
          <button
            type="submit"
            disabled={missing || identical}
            className="mt-1 md:mt-0 inline-flex items-center justify-center gap-2 rounded-2xl md:rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] h-12 md:h-14 px-6 md:px-8 font-display font-bold uppercase tracking-[0.18em] text-xs md:text-sm shadow-[var(--shadow-glow)] hover:brightness-105 transition disabled:opacity-50"
          >
            <Search className="size-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {attempted && (missing || identical) && (
        <p className="mt-3 text-xs text-destructive text-center" role="alert">
          {identical
            ? "Pickup and destination cannot be the same location."
            : "Please select pickup and destination from the suggestions."}
        </p>
      )}
    </form>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex items-center gap-2.5 px-3 md:px-5 py-2 md:py-2 min-w-0 rounded-xl md:rounded-none hover:bg-[var(--surface)]/70 md:hover:bg-transparent transition">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 truncate">
          {label}
        </span>
        <span className="block mt-0.5 [&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative">
          {children}
        </span>
      </span>
    </label>
  );
}
