import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X, Minus, Search, Flag, MapPin, Calendar, Clock, Users, Briefcase, Repeat, Car, Palmtree, AlertCircle, LifeBuoy } from "lucide-react";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { resolvePlaceText } from "@/lib/places.functions";
import { JourneyMap, PlaceMarkerMap } from "@/components/site/JourneyMap";
import { localMapMode } from "@/lib/local-page";
import { track } from "@/lib/tracking";


function FormNotice({ visible, messages }: { visible: boolean; messages: string[] }) {
  if (!visible || messages.length === 0) return null;
  return (
    <div className="mb-3 rounded-lg bg-destructive px-3 py-2.5 text-xs font-bold text-white shadow-sm" role="alert">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{messages.length === 1 ? "Please fix this to continue:" : `Please fix ${messages.length} things to continue:`}</span>
      </div>
      <ul className="mt-1.5 ml-6 list-disc space-y-1 font-semibold">
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}




type Tab = "quote" | "hourly";

function encodePlaces(list: SelectedPlace[]): string {
  return list.map((p) => `${p.placeId}::${encodeURIComponent(p.label)}`).join("|");
}

export function BookingWidget({
  idPrefix = "widget",
  tone = "dark",
  variant = "default",
  initialPickupLabel,
  initialDropoffLabel,
  mapFocus = null,
  showMap = true,
}: {
  idPrefix?: string;
  tone?: "dark" | "light";
  /** "hero" = clean stacked panel for local-page heroes (no tabs, no pill). */
  variant?: "default" | "hero";
  /** Prefills the pickup field with this text and resolves it to a place. */
  initialPickupLabel?: string;
  /** Prefills the drop-off field with this text and resolves it to a place. */
  initialDropoffLabel?: string;
  /** The page's own location, for the marker map when only one end is known. */
  mapFocus?: { lat: number; lng: number; label: string } | null;
  showMap?: boolean;
} = {}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("quote");
  const today = new Date().toISOString().slice(0, 10);

  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [stops, setStops] = useState<SelectedPlace[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState<string>("");
  const [passengers, setPassengers] = useState<number | null>(null);
  const [luggage, setLuggage] = useState<number>(0);
  const [handLuggage, setHandLuggage] = useState<number>(0);
  const [hours, setHours] = useState<number | null>(null);

  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState<string>("");
  const [attempted, setAttempted] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const paxRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Values entered into the server-rendered form before React hydrates exist
  // only in the DOM. Adopt them on mount so an early date/time pick is not
  // silently reset once the page becomes interactive.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fields: Array<[string, (v: string) => void]> = [
      ["date", setDate],
      ["time", setTime],
      ["returnDate", setReturnDate],
      ["returnTime", setReturnTime],
    ];
    for (const [name, set] of fields) {
      const el = root.querySelector<HTMLInputElement>(`input[data-field="${name}"]`);
      if (el?.value) set(el.value);
    }
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (paxRef.current && !paxRef.current.contains(e.target as Node)) setPaxOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Local pages prefill one or both ends with the page's own locations. The
  // text shows immediately; it is resolved to a real Place ID in the
  // background so the form can be submitted without the visitor retyping it.
  // If resolution fails the text stays and the dropdown still works.
  useEffect(() => {
    if (!initialPickupLabel && !initialDropoffLabel) return;
    let alive = true;
    const jobs: Array<[string | undefined, (p: SelectedPlace | null) => void]> = [
      [initialPickupLabel, setPickup],
      [initialDropoffLabel, setDropoff],
    ];
    (async () => {
      for (const [label, set] of jobs) {
        if (!label) continue;
        try {
          const r = await resolvePlaceText({ data: { input: label } });
          const p = r?.place;
          if (alive && p?.placeId) set({ placeId: p.placeId, label: p.full || p.primary || label });
        } catch {
          // Keep the prefilled text; the visitor can pick from the dropdown.
        }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPickupLabel, initialDropoffLabel]);

  const isPastDateTime = (d: string, t: string) => {
    if (!d || !t) return false;
    const dt = new Date(`${d}T${t}`);
    return !Number.isNaN(dt.getTime()) && dt.getTime() < Date.now() - 60_000;
  };

  
  const identicalPlaces = !!pickup?.placeId && !!dropoff?.placeId && pickup.placeId === dropoff.placeId;

  const errors = {
    pickup: !pickup?.placeId ? "Select a pickup address from the list, or use the address you typed." : "",
    dropoff: !dropoff?.placeId
      ? "Select a drop-off address from the list, or use the address you typed."
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
    passengers: "",
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
    if (passengers !== null) params.set("passengers", String(passengers));
    params.set("luggage", String(luggage));
    params.set("handLuggage", String(handLuggage));
    params.set("ret", showReturn ? "1" : "0");
    params.set("mode", "quote");
    if (showReturn) {
      params.set("rdate", returnDate);
      params.set("rtime", returnTime);
    }
    const validStops = stops.filter((s) => !!s?.placeId);
    if (validStops.length) params.set("stops", encodePlaces(validStops));
    track("quote_start", {
      pickup: pickup!.label,
      dropoff: dropoff!.label,
      passengers: passengers ?? 0,
      luggage,
      hand_luggage: handLuggage,
      stops: validStops.length,
      return_leg: showReturn,
      source: "booking_widget",
    });
    navigate({ to: "/book", search: { q: params.toString() } as never });

  };

  const hourlyErrors = {
    pickup: !pickup?.placeId ? "Select a pickup address from the list, or use the address you typed." : "",
    date: !date ? "Choose a travel date." : "",
    time: !time ? "Choose a start time." : isPastDateTime(date, time) ? "Start time cannot be in the past." : "",
    hours: hours === null ? "Choose how many hours you need." : "",
    passengers: "",
  };
  const hourlyErrorList = Object.values(hourlyErrors).filter(Boolean);


  return (
    <div ref={rootRef} className="@container w-full max-w-6xl mx-auto">
      {/* Tabs above the pill — local pages show the clean stacked form only. */}
      {variant !== "hero" && (
      <div className="flex items-center gap-0.5 mb-3 px-2 -mx-1 overflow-x-auto no-scrollbar @[420px]:gap-1 @[420px]:mx-0">
        <TabButton tone={tone} active={tab === "quote"} onClick={() => setTab("quote")} icon={<Car className="w-4 h-4" />}>
          Transfers
        </TabButton>
        <TabButton tone={tone} active={tab === "hourly"} onClick={() => setTab("hourly")} icon={<Clock className="w-4 h-4" />}>
          Hourly Hire
        </TabButton>
        <TabButton
          tone={tone}
          active={false}
          onClick={() => {
            track("tours_interest", { source: "booking_widget_tab" });
            navigate({ to: "/tours" });
          }}
          icon={<Palmtree className="w-4 h-4" />}
        >
          Day Tours
        </TabButton>
        <TabButton
          tone={tone}
          active={false}
          onClick={() => navigate({ to: "/manage-booking" })}
          icon={<LifeBuoy className="w-4 h-4" />}
        >
          Manage Booking
        </TabButton>
      </div>
      )}

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
            track("hourly_quote_start", {
              pickup: pickup!.label,
              hours: hours ?? 0,
              passengers: passengers ?? 0,
              luggage,
              hand_luggage: handLuggage,
              source: "booking_widget",
            });
            // Everything the hourly page asks for is already filled in here, so go
            // straight to choosing the tour and stops.
            navigate({
              to: "/book/tour",
              search: {
                pickupPlaceId: pickup!.placeId,
                pickupLabel: pickup!.label,
                date,
                time,
                hours: hours!,
                ...(passengers !== null ? { passengers } : {}),
                luggage,
              } as never,
            });

          }}

        >
        <>
          <FormNotice visible={attempted} messages={hourlyErrorList} />
          <div className="bg-white shadow-[var(--shadow-elegant)] border border-black/5 rounded-3xl @[980px]:rounded-full overflow-visible p-2 @[980px]:p-1.5">

            <div className="grid grid-cols-1 @[600px]:grid-cols-2 @[980px]:flex @[980px]:items-stretch gap-1 @[980px]:gap-0">
              <div className="@[600px]:col-span-2 @[980px]:flex-1 @[980px]:min-w-0" data-invalid={attempted && !!hourlyErrors.pickup}>
                <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold-ink)]" />} label="Pickup" invalid={attempted && !!hourlyErrors.pickup} error={hourlyErrors.pickup}>
                  <PlaceAutocomplete
                    id={`${idPrefix}-hourly-pickup`}
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Pickup location"
                    initialText={initialPickupLabel}
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent pl-0 pr-7 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
                    required
                  />
                </FieldCell>
              </div>

              <Divider />

              <div className="border-t border-black/5 @[980px]:border-0" data-invalid={attempted && !!hourlyErrors.date}>
                <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold-ink)]" />} label="Date" compact invalid={attempted && !!hourlyErrors.date} error={hourlyErrors.date}>
                  <input data-field="date" aria-label="Hourly hire date" required type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-foreground" />
                </FieldCell>
              </div>

              <Divider />

              <div className="border-t border-black/5 @[600px]:border-t-0 @[600px]:border-l @[600px]:border-black/5 @[980px]:border-l-0 @[980px]:border-0" data-invalid={attempted && !!hourlyErrors.time}>
                <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold-ink)]" />} label="Start time" compact invalid={attempted && !!hourlyErrors.time} error={hourlyErrors.time}>
                  <input data-field="time" aria-label="Hourly hire start time" required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-foreground" />
                </FieldCell>
              </div>


              <Divider />

              <div className="border-t border-black/5 @[980px]:border-0 @[980px]:w-[150px] shrink-0" data-invalid={attempted && !!hourlyErrors.hours}>
                <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold-ink)]" />} label="Duration" compact invalid={attempted && !!hourlyErrors.hours} error={hourlyErrors.hours}>
                  <select
                    aria-label="Hire duration in hours"
                    required
                    value={hours ?? ""}
                    onChange={(e) => setHours(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-foreground"
                  >
                    <option value="">Select hours</option>
                    {Array.from({ length: 12 }, (_, i) => i + 3).map((h) => (
                      <option key={h} value={h}>{h} hours</option>
                    ))}
                  </select>
                </FieldCell>
              </div>


              <Divider />

              <div
                ref={paxRef}
                className="relative min-w-0 @[600px]:col-span-2 @[980px]:col-span-1 @[980px]:flex-shrink-0 @[980px]:w-[168px] border-t border-black/5 @[980px]:border-0"
                data-invalid={attempted && !!hourlyErrors.passengers}
              >
                <button
                  type="button"
                  aria-label="Passengers and luggage"
                  aria-expanded={paxOpen}
                  onClick={() => setPaxOpen((v) => !v)}
                  aria-haspopup="dialog"
                  className={`w-full h-full flex items-center justify-center gap-3 px-4 py-3 @[980px]:py-2.5 overflow-hidden rounded-2xl @[980px]:rounded-full hover:bg-black/[0.03] transition-colors ${
                    attempted && hourlyErrors.passengers ? "bg-destructive/5 ring-1 ring-destructive/60" : ""
                  }`}
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
                    <span className="text-sm font-bold tabular-nums text-[var(--navy)]">
                      {luggage + handLuggage}
                    </span>
                  </span>
                </button>
                {paxOpen && (
                  <PassengerEditor passengers={passengers} luggage={luggage} handLuggage={handLuggage} onPassengers={setPassengers} onLuggage={setLuggage} onHandLuggage={setHandLuggage} onDone={() => setPaxOpen(false)} />
                )}

              </div>

              <button
                type="submit"
                className={`@[600px]:col-span-2 @[980px]:col-span-1 group cta-search inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-2xl @[980px]:rounded-full px-6 @[980px]:px-8 py-4 @[980px]:py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs shrink-0 ${hourlyErrorList.length === 0 ? "cta-search-ready" : ""}`}
              >
                <Search className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.5} />
                <span>See rates</span>
              </button>
            </div>
          </div>
          <p className={`text-xs mt-3 px-2 ${tone === "light" ? "text-[var(--navy)]/70" : "text-white/70"}`}>
            Car and driver at your disposal — travel as directed, multiple stops included.
          </p>
        </>
        </form>
      )}

      {tab === "quote" && variant !== "hero" && (
      <form onSubmit={submit} noValidate>
        <FormNotice visible={attempted} messages={errorList} />

        {/* Main container: rounded card on mobile/tablet, horizontal pill on wide desktop (xl+) */}

        <div className="bg-white shadow-[var(--shadow-elegant)] border border-black/5 overflow-visible p-2 @[980px]:p-1.5 rounded-3xl @[980px]:rounded-[2rem]">
          <div className="grid grid-cols-1 @[600px]:grid-cols-2 @[980px]:flex @[980px]:items-stretch gap-1 @[980px]:gap-0">
            {/* Pickup */}
            <div className="@[600px]:col-span-2 @[980px]:flex-1 @[980px]:min-w-0" data-invalid={attempted && !!errors.pickup}>
              <FieldCell icon={<MapPin className="w-4 h-4 text-[var(--gold-ink)]" />} label="From" invalid={attempted && !!errors.pickup} error={errors.pickup}>
                <PlaceAutocomplete
                  id={`${idPrefix}-pickup`}
                  value={pickup}
                  onChange={setPickup}
                  placeholder="Pickup location"
                  initialText={initialPickupLabel}
                  iconClassName="hidden"
                  inputClassName="border-0 shadow-none bg-transparent pl-0 pr-7 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
                  required
                />
              </FieldCell>
            </div>

            <Divider />

            {/* Dropoff */}
            <div className="@[600px]:col-span-2 @[980px]:flex-1 @[980px]:min-w-0 border-t border-black/5 @[600px]:border-t-0 @[980px]:border-0" data-invalid={attempted && !!errors.dropoff}>
              <FieldCell icon={<Flag className="w-4 h-4 text-[var(--gold-ink)]" />} label="To" invalid={attempted && !!errors.dropoff} error={errors.dropoff}>
                <PlaceAutocomplete
                  id={`${idPrefix}-dropoff`}
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="Destination"
                  initialText={initialDropoffLabel}
                  iconClassName="hidden"
                  inputClassName="border-0 shadow-none bg-transparent pl-0 pr-7 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
                  required
                />
              </FieldCell>
            </div>

            <Divider />

            {/* Date */}
            <div className="border-t border-black/5 @[980px]:border-0" data-invalid={attempted && !!errors.date}>
              <FieldCell icon={<Calendar className="w-4 h-4 text-[var(--gold-ink)]" />} label="Date" compact invalid={attempted && !!errors.date} error={errors.date}>
                <input
                  data-field="date"
                  aria-label="Pickup date"
                  required
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-foreground"
                />
              </FieldCell>
            </div>

            <Divider />

            {/* Time */}
            <div className="border-t border-black/5 @[600px]:border-t-0 @[600px]:border-l @[600px]:border-black/5 @[980px]:border-l-0 @[980px]:border-0" data-invalid={attempted && !!errors.time}>
              <FieldCell icon={<Clock className="w-4 h-4 text-[var(--gold-ink)]" />} label="Time" compact invalid={attempted && !!errors.time} error={errors.time}>
                <input
                  data-field="time"
                  aria-label="Pickup time"
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-foreground"
                />
              </FieldCell>
            </div>


            <Divider />

            {/* Passengers + Luggage popover */}
            <div
              className="relative min-w-0 @[600px]:col-span-2 @[980px]:col-span-1 @[980px]:flex-shrink-0 @[980px]:w-[204px] @[1240px]:w-[236px] border-t border-black/5 @[980px]:border-0"
              ref={paxRef}
              data-invalid={attempted && !!errors.passengers}
            >
              <button
                type="button"
                aria-expanded={paxOpen}
                aria-label="Passengers and luggage"
                onClick={() => setPaxOpen((v) => !v)}
                  aria-haspopup="dialog"
                className={`w-full h-full flex items-center justify-center gap-2.5 px-3 py-3 @[980px]:py-2.5 overflow-hidden whitespace-nowrap rounded-2xl @[980px]:rounded-full hover:bg-black/[0.03] transition-colors ${
                  attempted && errors.passengers ? "bg-destructive/5 ring-1 ring-destructive/60" : ""
                }`}
              >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Users className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                  {passengers === null ? (
                    <span className="text-sm text-[var(--navy)]/45 truncate">Passengers</span>
                  ) : (
                    <>
                      <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{passengers}</span>
                      <span className="hidden @[1240px]:inline text-[11px] font-semibold text-[var(--navy)]/60">{passengers === 1 ? "Person" : "People"}</span>
                    </>
                  )}
                </span>
                <span className="w-px h-4 bg-black/10 shrink-0" />
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Briefcase className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-[var(--navy)]">{luggage + handLuggage}</span>
                  <span className="hidden @[1240px]:inline text-[11px] font-semibold text-[var(--navy)]/60">{luggage + handLuggage === 1 ? "Bag" : "Bags"}</span>
                </span>
              </button>
              {paxOpen && (
                  <PassengerEditor passengers={passengers} luggage={luggage} handLuggage={handLuggage} onPassengers={setPassengers} onLuggage={setLuggage} onHandLuggage={setHandLuggage} onDone={() => setPaxOpen(false)} />
                )}

            </div>


            {/* Desktop search button — stays inside horizontal pill */}
            <button
              type="submit"
              className={`hidden @[980px]:inline-flex group cta-search items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-full px-8 py-2.5 font-display font-bold uppercase tracking-[0.18em] text-xs shrink-0 ${errorList.length === 0 ? "cta-search-ready" : ""}`}
            >
              <Search className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.5} />
              <span>Search</span>
            </button>

          </div>

        {/* Stops — extra rows inside the same form sheet */}
        {stops.length > 0 && (
          <div className="mt-1 border-t border-black/5 p-2 space-y-1">
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
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Stop {i + 1}</div>
                  <PlaceAutocomplete
                    value={s}
                    onChange={(v) => {
                      const next = [...stops];
                      next[i] = v ?? ({ placeId: "", label: "" } as SelectedPlace);
                      setStops(next);
                    }}
                    placeholder="Add stop"
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent pl-0 pr-7 h-auto py-0 text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/55"
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

        {/* Return journey — inside the same form sheet */}
        {showReturn && (
          <div className="border-t border-black/5 p-3 @[600px]:p-4">
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
            <div className="grid grid-cols-1 @[600px]:grid-cols-2 gap-3">
              <div
                data-invalid={attempted && !!errors.returnDate}
                className={`flex items-center gap-2 px-3 h-[54px] rounded-xl border ${attempted && errors.returnDate ? "border-destructive bg-destructive/5" : "border-border"}`}
              >
                <Calendar className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Date</div>
                  <input data-field="returnDate" aria-label="Return date" type="date" min={date || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-[var(--navy)]" />
                </div>
              </div>
              <div
                data-invalid={attempted && !!errors.returnTime}
                className={`flex items-center gap-2 px-3 h-[54px] rounded-xl border ${attempted && errors.returnTime ? "border-destructive bg-destructive/5" : "border-border"}`}
              >
                <Clock className="w-4 h-4 text-[var(--gold-ink)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/70">Time</div>
                  <input data-field="returnTime" aria-label="Return time" type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold text-[var(--navy)]" />
                </div>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* Separate actions; added fields stay in the original sheet. */}
        <div className="flex flex-wrap items-center gap-2 px-2 pt-3">
          <PillButton tone={tone} icon={<Plus className="w-3 h-3" strokeWidth={3} />} onClick={() => setStops([...stops, { placeId: "", label: "" }])}>
            Add stop
          </PillButton>
          {!showReturn && (
            <PillButton tone={tone} icon={<Repeat className="w-3 h-3" strokeWidth={3} />} onClick={() => setShowReturn(true)}>
              Add return
            </PillButton>
          )}
        </div>

        {/* Mobile/tablet search button — anchored at the bottom of the form */}
        <button
          type="submit"
          className={`w-full mt-4 @[980px]:hidden group cta-search inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--gold-foreground)] rounded-2xl px-6 py-4 font-display font-bold uppercase tracking-[0.18em] text-xs ${errorList.length === 0 ? "cta-search-ready" : ""}`}
        >
          <Search className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.5} />
          <span>Search</span>
        </button>


        {attempted && errorList.length > 0 && (
          <span className="sr-only" role="alert">{errorList.join(" ")}</span>
        )}


      </form>
      )}

      {tab === "quote" && variant === "hero" && (
        <form onSubmit={submit} noValidate>
          <FormNotice visible={attempted} messages={errorList} />

          {/* Clean stacked panel — no tabs, no pill. One clear row per field. */}
          <div className="rounded-2xl bg-white border border-black/5 shadow-[var(--shadow-elegant)] overflow-visible">
            {/* Pickup */}
            <div className="px-5 py-3.5" data-invalid={attempted && !!errors.pickup}>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 shrink-0 text-[var(--gold-ink)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Pickup</div>
                  <PlaceAutocomplete
                    id={`${idPrefix}-pickup`}
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Airport, address or postcode"
                    initialText={initialPickupLabel}
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent p-0 h-auto text-[15px] font-semibold text-foreground focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/40"
                    required
                  />
                </div>
                {attempted && errors.pickup && (
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive" aria-label={errors.pickup} />
                )}
              </div>
            </div>

            <div className="mx-5 h-px bg-black/[0.06]" />

            {/* Drop-off */}
            <div className="px-5 py-3.5" data-invalid={attempted && !!errors.dropoff}>
              <div className="flex items-center gap-3">
                <Flag className="w-4 h-4 shrink-0 text-[var(--gold-ink)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Drop-off</div>
                  <PlaceAutocomplete
                    id={`${idPrefix}-dropoff`}
                    value={dropoff}
                    onChange={setDropoff}
                    placeholder="Where are you going?"
                    initialText={initialDropoffLabel}
                    iconClassName="hidden"
                    inputClassName="border-0 shadow-none bg-transparent p-0 h-auto text-[15px] font-semibold text-foreground focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/40"
                    required
                  />
                </div>
                {attempted && errors.dropoff && (
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive" aria-label={errors.dropoff} />
                )}
              </div>
            </div>

            {/* Stops */}
            {stops.length > 0 && (
              <div className="border-t border-black/[0.06]">
                {stops.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3" data-invalid={attempted && !s?.placeId}>
                    <div className="flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[10px] font-bold text-[var(--navy)]/70">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <PlaceAutocomplete
                        value={s}
                        onChange={(v) => {
                          const next = [...stops];
                          next[i] = v ?? ({ placeId: "", label: "" } as SelectedPlace);
                          setStops(next);
                        }}
                        placeholder="Add stop"
                        iconClassName="hidden"
                        inputClassName="border-0 shadow-none bg-transparent p-0 h-auto text-sm font-semibold focus-visible:ring-0 placeholder:font-normal placeholder:text-[var(--navy)]/45"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
                      aria-label="Remove stop"
                      className="text-foreground/45 hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Return journey */}
            {showReturn && (
              <div className="border-t border-black/[0.06]">
                <div className="flex items-center justify-between px-5 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Return journey</p>
                  <button
                    type="button"
                    onClick={() => setShowReturn(false)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 divide-x divide-black/[0.06]">
                  <div className="px-5 py-3" data-invalid={attempted && !!errors.returnDate}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Date</div>
                    <input data-field="returnDate" aria-label="Return date" type="date" min={date || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[var(--navy)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]" />
                  </div>
                  <div className="px-5 py-3" data-invalid={attempted && !!errors.returnTime}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Time</div>
                    <input data-field="returnTime" aria-label="Return time" type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[var(--navy)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]" />
                  </div>
                </div>
              </div>
            )}

            {/* Date + time */}
            <div className="border-t border-black/[0.06] grid grid-cols-2 divide-x divide-black/[0.06]">
              <div className="px-5 py-3.5" data-invalid={attempted && !!errors.date}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 shrink-0 text-[var(--gold-ink)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Date</div>
                    <input data-field="date" aria-label="Pickup date" required type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]" />
                  </div>
                </div>
              </div>
              <div className="px-5 py-3.5" data-invalid={attempted && !!errors.time}>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0 text-[var(--gold-ink)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Time</div>
                    <input data-field="time" aria-label="Pickup time" required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Passengers & luggage */}
            <div ref={paxRef} className="relative border-t border-black/[0.06]" data-invalid={attempted && !!errors.passengers}>
              <button
                type="button"
                aria-expanded={paxOpen}
                aria-label="Passengers and luggage"
                onClick={() => setPaxOpen((v) => !v)}
                  aria-haspopup="dialog"
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
              >
                <Users className="w-4 h-4 shrink-0 text-[var(--gold-ink)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/55">Passengers & luggage</div>
                  <div className="text-sm font-semibold text-[var(--navy)]">
                    {passengers === null ? (
                      <span className="font-normal text-[var(--navy)]/40">Optional — confirm before choosing a vehicle</span>
                    ) : (
                      <>
                        {passengers} {passengers === 1 ? "person" : "people"} · {luggage + handLuggage} {luggage + handLuggage === 1 ? "bag" : "bags"}
                      </>
                    )}
                  </div>
                </div>
                <Briefcase className="w-4 h-4 shrink-0 text-[var(--gold-ink)]" />
              </button>
              {paxOpen && (
                  <PassengerEditor passengers={passengers} luggage={luggage} handLuggage={handLuggage} onPassengers={setPassengers} onLuggage={setLuggage} onHandLuggage={setHandLuggage} onDone={() => setPaxOpen(false)} />
                )}
            </div>

            {/* Search */}
            <div className="border-t border-black/[0.06] p-3">
              <button
                type="submit"
                className={`group cta-search flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 py-3.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-foreground)] ${errorList.length === 0 ? "cta-search-ready" : ""}`}
              >
                <Search className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.5} />
                <span>Search</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-2 pt-3">
            <PillButton tone={tone} icon={<Plus />} onClick={() => setStops([...stops, { placeId: "", label: "" }])}>Add stop</PillButton>
            {!showReturn && <PillButton tone={tone} icon={<Repeat />} onClick={() => setShowReturn(true)}>Add return</PillButton>}
          </div>

          {/* Quiet links to the other booking flows the tabs used to hold */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-2 text-xs">
            <button type="button" onClick={() => navigate({ to: "/book/hourly" })} className="font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline">Hourly hire</button>
            <button type="button" onClick={() => { track("tours_interest", { source: "booking_widget_hero_link" }); navigate({ to: "/tours" }); }} className="font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline">Day tours</button>
            <button type="button" onClick={() => navigate({ to: "/manage-booking" })} className="font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline">Manage booking</button>
          </div>
          <p className="mt-3 px-2 text-xs text-white/60">
            Fixed price confirmed before you pay · No surge pricing
          </p>

          {attempted && errorList.length > 0 && (
            <span className="sr-only" role="alert">{errorList.join(" ")}</span>
          )}
        </form>
      )}

      {variant === "hero" && showMap && (
        <BookingWidgetMap pickup={pickup} dropoff={dropoff} mapFocus={mapFocus} />
      )}

    </div>
  );
}

/** Map panel under the booking form: driving route when both ends are known,
 *  otherwise a location marker for the single known end. */
function BookingWidgetMap({
  pickup,
  dropoff,
  mapFocus,
}: {
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  mapFocus: { lat: number; lng: number; label: string } | null;
}) {
  const mode = localMapMode(pickup?.placeId, dropoff?.placeId, mapFocus);
  if (mode === "route" && pickup?.placeId && dropoff?.placeId) {
    return (
      <div className="mt-4">
        <JourneyMap pickupPlaceId={pickup.placeId} dropoffPlaceId={dropoff.placeId} />
      </div>
    );
  }
  if (mode !== "location" || !mapFocus) return null;
  return (
    <div className="mt-4">
      <PlaceMarkerMap lat={mapFocus.lat} lng={mapFocus.lng} label={mapFocus.label} />
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
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13px] @[420px]:px-4 @[420px]:text-sm font-bold font-display tracking-wide transition-colors border-b-2 ${
        active ? activeCls : idleCls
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function FieldCell({ icon, label, children, compact, invalid, error }: { icon: React.ReactNode; label: string; children: React.ReactNode; compact?: boolean; invalid?: boolean; error?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2 min-w-0 flex-1 rounded-md border transition-colors ${compact ? "@[980px]:w-[152px] @[980px]:max-w-[152px] @[980px]:flex-none" : ""} ${
        invalid ? "border-destructive bg-destructive/5 ring-1 ring-destructive/60" : "border-transparent"
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-bold uppercase tracking-[0.18em] truncate ${invalid ? "text-destructive" : "text-[var(--navy)]/70"}`}>{label}</div>
        <div className="[&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:w-full [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative min-w-0">

          {children}
        </div>
      </div>
      {invalid && (
        <span className="group/err relative shrink-0" title={error || "This field needs attention"}>
          <AlertCircle className="w-4 h-4 text-destructive" aria-label={error || "This field needs attention"} />
          {error && (
            <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden w-56 rounded-lg bg-destructive px-3 py-2 text-[11px] font-semibold leading-snug text-white shadow-lg group-hover/err:block">
              {error}
            </span>
          )}
        </span>
      )}
    </div>
  );
}



function Divider() {
  return <div className="hidden @[980px]:block w-px bg-border my-2 shrink-0" />;
}


function PassengerEditor({ passengers, luggage, handLuggage, onPassengers, onLuggage, onHandLuggage, onDone }: {
  passengers: number | null; luggage: number; handLuggage: number;
  onPassengers: (value: number) => void; onLuggage: (value: number) => void;
  onHandLuggage: (value: number) => void; onDone: () => void;
}) {
  return (
    <div role="dialog" aria-label="Passengers and bags" onKeyDown={(event) => { if (event.key === "Escape") onDone(); }} className="absolute top-full right-0 z-50 mt-2 w-80 max-w-full rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-elegant">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-bold">Passengers & bags</h3>
        <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Close passengers and bags" onClick={onDone}><X /></Button>
      </div>
      <div className="divide-y divide-border">
        <StepperRow icon={<Users />} label="Passengers" hint="Including children" value={passengers} min={1} max={16} onChange={onPassengers} />
        <StepperRow icon={<Briefcase />} label="Luggage" hint="Large cases" value={luggage} min={0} max={10} onChange={onLuggage} />
        <StepperRow icon={<Briefcase />} label="Hand luggage" hint="Cabin / small bags" value={handLuggage} min={0} max={10} onChange={onHandLuggage} />
      </div>
      <Button type="button" variant="gold" className="mt-4 w-full" onClick={onDone}>Done</Button>
    </div>
  );
}

function StepperRow({ icon, label, hint, value, min, max, onChange }: {
  icon: React.ReactNode; label: string; hint?: string; value: number | null;
  min: number; max: number; onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-gold [&_svg]:size-4" aria-hidden="true">{icon}</span>
        <div><div className="text-xs font-semibold text-foreground">{label}</div><div className="mt-1 text-[10px] text-muted-foreground">{hint}</div></div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="outline" size="icon" className="size-9 rounded-full" onClick={() => onChange(value === null ? min : Math.max(min, value - 1))} disabled={value === null || value <= min} aria-label={`Decrease ${label}`}><Minus /></Button>
        <input type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={value ?? ""} placeholder="—" onChange={(event) => { const count = Number(event.target.value); if (event.target.value && Number.isInteger(count) && count >= min && count <= max) onChange(count); }} className="h-9 w-10 rounded-md border border-input bg-background text-center text-sm font-bold tabular-nums text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        <Button type="button" variant="outline" size="icon" className="size-9 rounded-full" onClick={() => onChange(value === null ? Math.max(min, 1) : Math.min(max, value + 1))} disabled={value !== null && value >= max} aria-label={`Increase ${label}`}><Plus /></Button>
      </div>
    </div>
  );
}

function PillButton({ onClick, children, icon, tone = "dark" }: { onClick: () => void; children: React.ReactNode; icon: React.ReactNode; tone?: "dark" | "light" | "white" }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} className={`min-h-10 rounded-full px-3 text-xs font-semibold ${tone === "light" ? "text-foreground hover:bg-secondary" : "text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground"}`}>
      <span className="flex size-5 items-center justify-center text-gold [&_svg]:size-3.5">{icon}</span>
      {children}
    </Button>
  );
}
