import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X, Minus, Search, Flag, MapPin, Calendar, Clock, Users, Briefcase, Repeat, Car, Palmtree } from "lucide-react";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

type Tab = "quote" | "hourly";

function encodePlaces(list: SelectedPlace[]): string {
  return list.map((p) => `${p.placeId}::${encodeURIComponent(p.label)}`).join("|");
}

export function BookingWidget({
  idPrefix = "widget",
  tone = "dark",
}: { idPrefix?: string; tone?: "dark" | "light" } = {}) {
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
  const [hours, setHours] = useState(4);

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

  const isPastDateTime = (d: string, t: string) => {
    if (!d || !t) return false;
    const dt = new Date(`${d}T${t}`);
    return !Number.isNaN(dt.getTime()) && dt.getTime() < Date.now() - 60_000;
  };

  
  const identicalPlaces = !!pickup?.placeId && !!dropoff?.placeId && pickup.placeId === dropoff.placeId;

  const errors = {
    pickup: !pickup?.placeId ? "Select a pickup location from the suggestions." : "",
    dropoff: !dropoff?.placeId
      ? "Select a destination from the suggestions."
      : identicalPlaces
        ? "Destination cannot be the same as pickup."
        : "",
    date: !date ? "Choose a travel date." : "",
    time: !time ? "Choose a pickup time." : isPastDateTime(date, time) ? "Pickup time cannot be in the past." : "",
    returnDate: showReturn && !returnDate ? "Choose a return date." : "",
    returnTime: showReturn
      ? !returnTime
        ? "Choose a return time."
        : new Date(`${returnDate}T${returnTime}`).getTime() <= new Date(`${date}T${time}`).getTime()
          ? "Return must be after the outbound journey."
          : ""
      : "",
    stops: stops.some((s) => !s?.placeId) ? "Complete or remove empty stops." : "",
  };
  const errorList = Object.values(errors).filter(Boolean);

  const focusFirstInvalid = (form: HTMLFormElement) => {
    const el = form.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] select');
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttempted(true);
    if (errorList.length) {
      focusFirstInvalid(e.currentTarget);
      return;
    }

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

  const hourlyErrors = {
    pickup: !pickup?.placeId ? "Select a pickup location from the suggestions." : "",
    date: !date ? "Choose a travel date." : "",
    time: !time ? "Choose a start time." : isPastDateTime(date, time) ? "Start time cannot be in the past." : "",
  };
  const hourlyErrorList = Object.values(hourlyErrors).filter(Boolean);


  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tabs above the pill */}
      <div className="flex items-center gap-1 mb-3 px-2">
        <TabButton tone={tone} active={tab === "quote"} onClick={() => setTab("quote")} icon={<Car className="w-4 h-4" />}>
          Transfers
        </TabButton>
        <TabButton tone={tone} active={tab === "hourly"} onClick={() => setTab("hourly")} icon={<Clock className="w-4 h-4" />}>
          Hourly Hire
        </TabButton>
        <TabButton tone={tone} active={false} onClick={() => navigate({ to: "/tours" })} icon={<Palmtree className="w-4 h-4" />}>
          Day Tours
        </TabButton>
      </div>

      {tab === "hourly" && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setAttempted(true);
            if (hourlyErrorList.length) {
              focusFirstInvalid(e.currentTarget);
              return;
            }
            const params = new URLSearchParams();
            params.set("pickupPlaceId", pickup!.placeId);
            params.set("pickupLabel", pickup!.label);
            params.set("date", date);
            params.set("time", time);
            params.set("hours", String(hours));
            params.set("passengers", String(passengers));
            params.set("luggage", String(luggage));
            navigate({ to: "/book/hourly", search: { q: params.toString() } as never });
          }}

        >
          <div className="bg-white shadow-[var(--shadow-elegant)] border border-black/5 rounded-3xl lg:rounded-full overflow-visible p-2 lg:p-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-stretch gap-1 lg:gap-0">
              <div className="sm:col-span-2 lg:flex-1 lg:min-w-0" data-invalid={attempted && !!hourlyErrors.pickup}>
                <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold)]" />} label="Pickup" invalid={attempted && !!hourlyErrors.pickup}>
                  <PlaceAutocomplete
                    id={`${idPrefix}-hourly-pickup`}
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Pickup city, hotel, airport"
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
                    required
                  />
                </FieldCell>
              </div>

              <Divider />

              <div className="border-t border-black/5 lg:border-0" data-invalid={attempted && !!hourlyErrors.date}>
                <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold)]" />} label="Date" compact invalid={attempted && !!hourlyErrors.date}>
                  <input required type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground" />
                </FieldCell>
              </div>

              <Divider />

              <div className="border-t border-black/5 sm:border-t-0 sm:border-l sm:border-black/5 lg:border-l-0 lg:border-0" data-invalid={attempted && !!hourlyErrors.time}>
                <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Start time" compact invalid={attempted && !!hourlyErrors.time}>
                  <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground" />
                </FieldCell>
              </div>


              <Divider />

              <div className="border-t border-black/5 lg:border-0 lg:w-[150px] shrink-0">
                <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Duration" compact>
                  <select
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 3).map((h) => (
                      <option key={h} value={h}>{h} hours</option>
                    ))}
                  </select>
                </FieldCell>
              </div>

              <Divider />

              <div className="relative sm:col-span-2 lg:col-span-1 lg:flex-shrink-0 lg:w-[170px] border-t border-black/5 lg:border-0">
                <button
                  type="button"
                  onClick={() => setPaxOpen((v) => !v)}
                  className="w-full h-full flex items-center justify-center gap-3 px-4 py-3 lg:py-2.5 rounded-2xl lg:rounded-full hover:bg-black/[0.03] transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--gold)] shrink-0" />
                    <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{passengers}</span>
                  </span>
                  <span className="w-px h-4 bg-black/10" />
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[var(--gold)] shrink-0" />
                    <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{luggage}</span>
                  </span>
                </button>
                {paxOpen && (
                  <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white rounded-2xl shadow-[var(--shadow-elegant)] border border-border p-4 space-y-3">
                    <StepperRow label="Passengers" value={passengers} min={1} max={16} onChange={setPassengers} />
                    <StepperRow label="Luggage" value={luggage} min={0} max={10} onChange={setLuggage} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="sm:col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-2xl lg:rounded-full px-6 lg:px-8 py-4 lg:py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs hover:brightness-105 transition-all shrink-0"
              >
                <Search className="w-4 h-4" strokeWidth={2.5} />
                <span>See rates</span>
              </button>
            </div>
          </div>
          <p className={`text-xs mt-3 px-2 ${tone === "light" ? "text-[var(--navy)]/70" : "text-white/70"}`}>
            Car and driver at your disposal — travel as directed, multiple stops included.
          </p>
          {attempted && hourlyErrorList.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-destructive text-center" role="alert">
              {hourlyErrorList.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

        </form>
      )}

      {tab === "quote" && (
      <form onSubmit={submit} noValidate>

        {/* Main container: rounded card on mobile/tablet, horizontal pill on wide desktop (xl+) */}
        <div className="bg-white shadow-[var(--shadow-elegant)] border border-black/5 rounded-3xl lg:rounded-full overflow-visible p-2 lg:p-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-stretch gap-1 lg:gap-0">
            {/* Pickup */}
            <div className="sm:col-span-2 lg:flex-1 lg:min-w-0" data-invalid={attempted && !!errors.pickup}>
              <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold)]" />} label="From" invalid={attempted && !!errors.pickup}>
                <PlaceAutocomplete
                  id={`${idPrefix}-pickup`}
                  value={pickup}
                  onChange={setPickup}
                  placeholder="From city, hotel, airport"
                  iconClassName="hidden"
                  inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
                  required
                />
              </FieldCell>
            </div>

            <Divider />

            {/* Dropoff */}
            <div className="sm:col-span-2 lg:flex-1 lg:min-w-0 border-t border-black/5 sm:border-t-0 lg:border-0" data-invalid={attempted && !!errors.dropoff}>
              <FieldCell icon={<Flag className="w-4 h-4 text-[var(--gold)]" />} label="To" invalid={attempted && !!errors.dropoff}>
                <PlaceAutocomplete
                  id={`${idPrefix}-dropoff`}
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="To city, hotel, airport"
                  iconClassName="hidden"
                  inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
                  required
                />
              </FieldCell>
            </div>

            <Divider />

            {/* Date */}
            <div className="border-t border-black/5 lg:border-0" data-invalid={attempted && !!errors.date}>
              <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold)]" />} label="Date" compact invalid={attempted && !!errors.date}>
                <input
                  required
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
                />
              </FieldCell>
            </div>

            <Divider />

            {/* Time */}
            <div className="border-t border-black/5 sm:border-t-0 sm:border-l sm:border-black/5 lg:border-l-0 lg:border-0" data-invalid={attempted && !!errors.time}>
              <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold)]" />} label="Time" compact invalid={attempted && !!errors.time}>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
                />
              </FieldCell>
            </div>


            <Divider />

            {/* Passengers + Luggage popover */}
            <div className="relative sm:col-span-2 lg:col-span-1 lg:flex-shrink-0 lg:w-[190px] border-t border-black/5 lg:border-0" ref={paxRef}>
              <button
                type="button"
                onClick={() => setPaxOpen((v) => !v)}
                className="w-full h-full flex items-center justify-center gap-3 px-4 py-3 lg:py-2.5 rounded-2xl lg:rounded-full hover:bg-black/[0.03] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{passengers}</span>
                  <span className="text-[11px] font-semibold text-[var(--navy)]/60">{passengers === 1 ? "Person" : "People"}</span>
                </span>
                <span className="w-px h-4 bg-black/10" />
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{luggage}</span>
                  <span className="text-[11px] font-semibold text-[var(--navy)]/60">{luggage === 1 ? "Bag" : "Bags"}</span>
                </span>
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
              className="sm:col-span-2 lg:col-span-1 group inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-2xl lg:rounded-full px-6 lg:px-8 py-4 lg:py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs hover:brightness-105 transition-all shrink-0"
            >
              <Search className="w-4 h-4" strokeWidth={2.5} />
              <span>Search</span>
            </button>

          </div>
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
              <div
                key={i}
                data-invalid={attempted && !s?.placeId}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${attempted && !s?.placeId ? "bg-destructive/5 ring-1 ring-destructive/60" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Stop {i + 1}</div>
                  <PlaceAutocomplete
                    value={s}
                    onChange={(v) => {
                      const next = [...stops];
                      next[i] = v ?? ({ placeId: "", label: "" } as SelectedPlace);
                      setStops(next);
                    }}
                    placeholder="Add stop"
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent px-0 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
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
              <div
                data-invalid={attempted && !!errors.returnDate}
                className={`flex items-center gap-2 px-3 h-[54px] rounded-xl border ${attempted && errors.returnDate ? "border-destructive bg-destructive/5" : "border-border"}`}
              >
                <Calendar className="w-4 h-4 text-[var(--gold)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Date</div>
                  <input type="date" min={date || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold" />
                </div>
              </div>
              <div
                data-invalid={attempted && !!errors.returnTime}
                className={`flex items-center gap-2 px-3 h-[54px] rounded-xl border ${attempted && errors.returnTime ? "border-destructive bg-destructive/5" : "border-border"}`}
              >
                <Clock className="w-4 h-4 text-[var(--gold)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Time</div>
                  <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold" />
                </div>
              </div>
            </div>
          </div>
        )}

        {attempted && errorList.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-destructive text-center" role="alert">
            {errorList.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}

      </form>
      )}

    </div>
  );
}

function TabButton({ active, onClick, icon, children, tone = "dark" }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode; tone?: "dark" | "light" }) {
  const activeCls = tone === "light" ? "text-[var(--navy)] border-[var(--gold)]" : "text-white border-[var(--gold)]";
  const idleCls =
    tone === "light"
      ? "text-[var(--navy)]/60 border-transparent hover:text-[var(--navy)]"
      : "text-white/60 border-transparent hover:text-white/90";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold font-display tracking-wide transition-colors border-b-2 ${
        active ? activeCls : idleCls
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function FieldCell({ icon, label, children, compact, invalid }: { icon: React.ReactNode; label: string; children: React.ReactNode; compact?: boolean; invalid?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2 min-w-0 flex-1 rounded-2xl lg:rounded-full transition-colors ${compact ? "lg:max-w-[150px]" : ""} ${
        invalid ? "bg-destructive/5 ring-1 ring-destructive/60" : ""
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${invalid ? "text-destructive" : "text-[var(--navy)]/70"}`}>{label}</div>
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
          className="w-8 h-8 rounded-full bg-[var(--navy)] text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-125 transition flex items-center justify-center"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full bg-[var(--navy)] text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-125 transition flex items-center justify-center"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function PillButton({ onClick, children, icon, tone = "dark" }: { onClick: () => void; children: React.ReactNode; icon: React.ReactNode; tone?: "dark" | "light" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur ${
        tone === "light"
          ? "bg-[var(--navy)]/6 text-[var(--navy)] ring-1 ring-[var(--navy)]/12 hover:bg-[var(--navy)]/12"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-[var(--gold)]/25 text-[var(--gold)] flex items-center justify-center">
        {icon}
      </span>
      {children}
    </button>
  );
}
