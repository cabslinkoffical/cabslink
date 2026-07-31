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

  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [stops, setStops] = useState<SelectedPlace[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState<string>("");
  const [passengers, setPassengers] = useState<number | null>(null);
  const [luggage, setLuggage] = useState<number | null>(null);
  const [hours, setHours] = useState<number | null>(null);

  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState<string>("");
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
    passengers: passengers === null ? "Select the number of passengers." : "",
    luggage: luggage === null ? "Select how many bags you have." : "",
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
    <div className="@container w-full max-w-6xl mx-auto">
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
          <div className="bg-white shadow-[var(--shadow-elegant)] border border-black/5 rounded-3xl @[980px]:rounded-full overflow-visible p-2 @[980px]:p-1.5">
            <div className="grid grid-cols-1 @[600px]:grid-cols-2 @[980px]:flex @[980px]:items-stretch gap-1 @[980px]:gap-0">
              <div className="@[600px]:col-span-2 @[980px]:flex-1 @[980px]:min-w-0" data-invalid={attempted && !!hourlyErrors.pickup}>
                <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold-ink)]" />} label="Pickup" invalid={attempted && !!hourlyErrors.pickup}>
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

              <div className="border-t border-black/5 @[980px]:border-0" data-invalid={attempted && !!hourlyErrors.date}>
                <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold-ink)]" />} label="Date" compact invalid={attempted && !!hourlyErrors.date}>
                  <input required type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground" />
                </FieldCell>
              </div>

              <Divider />

              <div className="border-t border-black/5 @[600px]:border-t-0 @[600px]:border-l @[600px]:border-black/5 @[980px]:border-l-0 @[980px]:border-0" data-invalid={attempted && !!hourlyErrors.time}>
                <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold-ink)]" />} label="Start time" compact invalid={attempted && !!hourlyErrors.time}>
                  <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground" />
                </FieldCell>
              </div>


              <Divider />

              <div className="border-t border-black/5 @[980px]:border-0 @[980px]:w-[150px] shrink-0">
                <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold-ink)]" />} label="Duration" compact>
                  <select
                    value={hours ?? ""}
                    onChange={(e) => setHours(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground"
                  >
                    <option value="">Select hours</option>
                    {Array.from({ length: 12 }, (_, i) => i + 3).map((h) => (
                      <option key={h} value={h}>{h} hours</option>
                    ))}
                  </select>
                </FieldCell>
              </div>

              <Divider />

              <div className="relative @[600px]:col-span-2 @[980px]:col-span-1 @[980px]:flex-shrink-0 @[980px]:w-[170px] border-t border-black/5 @[980px]:border-0">
                <button
                  type="button"
                  onClick={() => setPaxOpen((v) => !v)}
                  className="w-full h-full flex items-center justify-center gap-3 px-4 py-3 @[980px]:py-2.5 rounded-2xl @[980px]:rounded-full hover:bg-black/[0.03] transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                    <span className={`text-sm font-bold tabular-nums ${passengers === null ? "text-[var(--navy)]/45 font-normal" : "text-[var(--navy)]"}`}>
                      {passengers === null ? "Passengers" : passengers}
                    </span>
                  </span>
                  <span className="w-px h-4 bg-black/10" />
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                    <span className={`text-sm font-bold tabular-nums ${luggage === null ? "text-[var(--navy)]/45 font-normal" : "text-[var(--navy)]"}`}>
                      {luggage === null ? "Bags" : luggage}
                    </span>
                  </span>
                </button>
                {paxOpen && (
                  <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-white rounded-xl shadow-[var(--shadow-elegant)] border border-border p-4 divide-y divide-border">
                    <div className="pb-2">
                      <StepperRow label="Passengers" hint="Including children" value={passengers} min={1} max={16} onChange={setPassengers} />
                    </div>
                    <div className="pt-2">
                      <StepperRow label="Luggage" hint="Large cases" value={luggage} min={0} max={10} onChange={setLuggage} />
                    </div>
                  </div>
                )}

              </div>

              <button
                type="submit"
                className="@[600px]:col-span-2 @[980px]:col-span-1 inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-2xl @[980px]:rounded-full px-6 @[980px]:px-8 py-4 @[980px]:py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs hover:brightness-105 transition-all shrink-0"
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
        <div className="bg-white shadow-[var(--shadow-elegant)] border border-black/5 rounded-3xl @[980px]:rounded-full overflow-visible p-2 @[980px]:p-1.5">
          <div className="grid grid-cols-1 @[600px]:grid-cols-2 @[980px]:flex @[980px]:items-stretch gap-1 @[980px]:gap-0">
            {/* Pickup */}
            <div className="@[600px]:col-span-2 @[980px]:flex-1 @[980px]:min-w-0" data-invalid={attempted && !!errors.pickup}>
              <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold-ink)]" />} label="From" invalid={attempted && !!errors.pickup}>
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
            <div className="@[600px]:col-span-2 @[980px]:flex-1 @[980px]:min-w-0 border-t border-black/5 @[600px]:border-t-0 @[980px]:border-0" data-invalid={attempted && !!errors.dropoff}>
              <FieldCell icon={<Flag className="w-4 h-4 text-[var(--gold-ink)]" />} label="To" invalid={attempted && !!errors.dropoff}>
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
            <div className="border-t border-black/5 @[980px]:border-0" data-invalid={attempted && !!errors.date}>
              <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold-ink)]" />} label="Date" compact invalid={attempted && !!errors.date}>
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
            <div className="border-t border-black/5 @[600px]:border-t-0 @[600px]:border-l @[600px]:border-black/5 @[980px]:border-l-0 @[980px]:border-0" data-invalid={attempted && !!errors.time}>
              <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold-ink)]" />} label="Time" compact invalid={attempted && !!errors.time}>
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
            <div className="relative @[600px]:col-span-2 @[980px]:col-span-1 @[980px]:flex-shrink-0 @[980px]:w-[190px] border-t border-black/5 @[980px]:border-0" ref={paxRef}>
              <button
                type="button"
                onClick={() => setPaxOpen((v) => !v)}
                className="w-full h-full flex items-center justify-center gap-3 px-4 py-3 @[980px]:py-2.5 rounded-2xl @[980px]:rounded-full hover:bg-black/[0.03] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{passengers}</span>
                  <span className="text-[11px] font-semibold text-[var(--navy)]/60">{passengers === 1 ? "Person" : "People"}</span>
                </span>
                <span className="w-px h-4 bg-black/10" />
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{luggage}</span>
                  <span className="text-[11px] font-semibold text-[var(--navy)]/60">{luggage === 1 ? "Bag" : "Bags"}</span>
                </span>
              </button>
              {paxOpen && (
                <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-white rounded-xl shadow-[var(--shadow-elegant)] border border-border p-4 divide-y divide-border">
                  <div className="pb-2">
                    <StepperRow label="Passengers" hint="Including children" value={passengers} min={1} max={16} onChange={setPassengers} />
                  </div>
                  <div className="pt-2">
                    <StepperRow label="Luggage" hint="Large cases" value={luggage} min={0} max={10} onChange={setLuggage} />
                  </div>
                </div>
              )}

            </div>


            {/* Search button */}
            <button
              type="submit"
              className="@[600px]:col-span-2 @[980px]:col-span-1 group inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-2xl @[980px]:rounded-full px-6 @[980px]:px-8 py-4 @[980px]:py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs hover:brightness-105 transition-all shrink-0"
            >
              <Search className="w-4 h-4" strokeWidth={2.5} />
              <span>Search</span>
            </button>

          </div>
        </div>


        {/* Secondary row: stops / return / multi-city pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 px-2">
          <PillButton tone={tone} icon={<Plus className="w-3 h-3" strokeWidth={3} />} onClick={() => setStops([...stops, { placeId: "", label: "" }])}>
            Add stop
          </PillButton>
          {!showReturn && (
            <PillButton tone={tone} icon={<Repeat className="w-3 h-3" strokeWidth={3} />} onClick={() => setShowReturn(true)}>
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
          <div className="mt-3 bg-white rounded-2xl border border-border p-3 @[600px]:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Return Journey</p>
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
                <Calendar className="w-4 h-4 text-[var(--gold-ink)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Date</div>
                  <input type="date" min={date || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full bg-transparent border-0 outline-none text-sm font-semibold" />
                </div>
              </div>
              <div
                data-invalid={attempted && !!errors.returnTime}
                className={`flex items-center gap-2 px-3 h-[54px] rounded-xl border ${attempted && errors.returnTime ? "border-destructive bg-destructive/5" : "border-border"}`}
              >
                <Clock className="w-4 h-4 text-[var(--gold-ink)]" />
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
      className={`flex items-center gap-2.5 px-4 py-2 min-w-0 flex-1 rounded-2xl @[980px]:rounded-full transition-colors ${compact ? "@[980px]:w-[152px] @[980px]:max-w-[152px] @[980px]:flex-none" : ""} ${
        invalid ? "bg-destructive/5 ring-1 ring-destructive/60" : ""
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-[9px] font-bold uppercase tracking-[0.18em] truncate ${invalid ? "text-destructive" : "text-[var(--navy)]/70"}`}>{label}</div>
        <div className="[&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:w-full [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative min-w-0">

          {children}
        </div>
      </div>
    </div>
  );
}


function Divider() {
  return <div className="hidden @[980px]:block w-px bg-border my-2 shrink-0" />;
}


function StepperRow({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: { label: string; hint?: string; value: number | null; min: number; max: number; onChange: (v: number) => void }) {
  const atMin = value !== null && value <= min;
  const atMax = value !== null && value >= max;
  const btn =
    "w-9 h-9 flex items-center justify-center text-[var(--navy)] transition-colors hover:bg-[var(--navy)]/[0.06] active:bg-[var(--navy)]/[0.12] disabled:text-[var(--navy)]/25 disabled:hover:bg-transparent disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-inset";

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--navy)]">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex items-center rounded-lg border border-border overflow-hidden bg-background shrink-0">
        <button
          type="button"
          onClick={() => onChange(value === null ? min : Math.max(min, value - 1))}
          disabled={atMin}
          className={btn}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <span
          className="w-10 text-center text-sm font-bold tabular-nums text-[var(--navy)] border-x border-border py-1.5"
          aria-live="polite"
        >
          {value === null ? "—" : value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value === null ? Math.max(min, 1) : Math.min(max, value + 1))}
          disabled={atMax}
          className={btn}
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
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
