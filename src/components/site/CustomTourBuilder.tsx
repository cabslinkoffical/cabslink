import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, ArrowDown, ArrowUp, Loader2, MapPin, Plus, Search, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import {
  matchTourByRoute, corridorPoiOptions, searchPoiOptions, type PoiOption,
} from "@/lib/custom-tour.functions";
import { cn } from "@/lib/utils";

type BuilderStop = {
  placeId: string;
  label: string;
  minutes: number;
  /** Where the stop came from — used only for the UI badge. */
  source: "tour" | "suggested" | "manual";
};

const MIN_STEP = 15;

function clampMinutes(n: number, min = 0, max = 240) {
  if (!Number.isFinite(n)) return 30;
  return Math.max(min, Math.min(max, Math.round(n / 5) * 5));
}

function formatMinutes(m: number) {
  if (m <= 0) return "Drive past";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function CustomTourBuilder() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [stops, setStops] = useState<BuilderStop[]>([]);
  const [matchedSlug, setMatchedSlug] = useState<string>("");
  const [prefilledFor, setPrefilledFor] = useState<string>("");
  const [poiQuery, setPoiQuery] = useState("");
  const [manualStop, setManualStop] = useState<SelectedPlace | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const routeKey = pickup && dropoff ? `${pickup.placeId}|${dropoff.placeId}` : "";
  const sameEndpoints = !!pickup && !!dropoff && pickup.placeId === dropoff.placeId;
  const routeReady = !!routeKey && !sameEndpoints;

  const matchFn = useServerFn(matchTourByRoute);
  const matchQuery = useQuery({
    enabled: routeReady,
    queryKey: ["custom-tour-match", routeKey],
    staleTime: 5 * 60_000,
    queryFn: () =>
      matchFn({ data: { pickup_place_id: pickup!.placeId, destination_place_id: dropoff!.placeId } }),
  });

  const corridorFn = useServerFn(corridorPoiOptions);
  const corridorQuery = useQuery({
    enabled: routeReady,
    queryKey: ["custom-tour-corridor", routeKey],
    staleTime: 5 * 60_000,
    queryFn: () =>
      corridorFn({
        data: { pickup_place_id: pickup!.placeId, destination_place_id: dropoff!.placeId },
      }),
  });

  const searchFn = useServerFn(searchPoiOptions);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(poiQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [poiQuery]);
  const poiSearchQuery = useQuery({
    enabled: debounced.length >= 2,
    queryKey: ["custom-tour-poi-search", debounced],
    staleTime: 60_000,
    queryFn: () => searchFn({ data: { q: debounced, limit: 12 } }),
  });

  // Pre-fill the itinerary from a matched published tour — once per route pair,
  // so the customer's own edits are never overwritten by a refetch.
  useEffect(() => {
    if (!routeReady || !matchQuery.data) return;
    if (prefilledFor === routeKey) return;
    const m = matchQuery.data;
    setPrefilledFor(routeKey);
    if (m.kind === "none" || !m.tour) {
      setMatchedSlug("");
      return;
    }
    setMatchedSlug(m.tour.slug);
    const base = m.tour.pois
      .filter((p) => p.default_selected)
      .sort((a, b) => a.stop_order - b.stop_order);
    const ordered = m.kind === "reversed" ? base.slice().reverse() : base;
    setStops(
      ordered.map((p) => ({
        placeId: p.place_id,
        label: p.name,
        minutes: clampMinutes(p.recommended_visit_minutes || 30, p.minimum_visit_minutes, p.maximum_visit_minutes),
        source: "tour" as const,
      })),
    );
  }, [routeKey, routeReady, matchQuery.data, prefilledFor]);

  // A changed route pair invalidates a previously matched template.
  useEffect(() => {
    if (prefilledFor && prefilledFor !== routeKey) {
      setMatchedSlug("");
      setStops((prev) => prev.filter((s) => s.source === "manual"));
      setPrefilledFor("");
    }
  }, [routeKey, prefilledFor]);

  const matched = matchQuery.data?.tour ?? null;
  const selectedIds = useMemo(() => new Set(stops.map((s) => s.placeId)), [stops]);

  const suggestions: PoiOption[] = useMemo(() => {
    const list = debounced.length >= 2 ? (poiSearchQuery.data ?? []) : (corridorQuery.data?.pois ?? []);
    return list.filter((p) => !selectedIds.has(p.place_id));
  }, [debounced, poiSearchQuery.data, corridorQuery.data, selectedIds]);

  // Stops offered by the matched tour that the customer removed / never had.
  const tourExtras: PoiOption[] = useMemo(() => {
    if (!matched) return [];
    return matched.pois
      .filter((p) => !selectedIds.has(p.place_id))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        place_id: p.place_id,
        name: p.name,
        category: p.category,
        short_description: p.short_description,
        image_url: p.image_url,
        recommended_visit_minutes: p.recommended_visit_minutes || 30,
        minimum_visit_minutes: p.minimum_visit_minutes,
        maximum_visit_minutes: p.maximum_visit_minutes,
        stop_fee_pence: p.stop_fee_pence,
        parking_fee_pence: p.parking_fee_pence,
        featured: p.featured,
        detour_miles: null,
      }));
  }, [matched, selectedIds]);

  const addPoi = (p: PoiOption, source: BuilderStop["source"]) => {
    setError(null);
    setStops((prev) =>
      prev.some((s) => s.placeId === p.place_id)
        ? prev
        : [
            ...prev,
            {
              placeId: p.place_id,
              label: p.name,
              minutes: clampMinutes(p.recommended_visit_minutes || 30, p.minimum_visit_minutes, p.maximum_visit_minutes),
              source,
            },
          ],
    );
  };

  const addManual = () => {
    if (!manualStop) return;
    if (manualStop.placeId === pickup?.placeId || manualStop.placeId === dropoff?.placeId) {
      setError("That place is already your start or end point.");
      return;
    }
    setError(null);
    setStops((prev) =>
      prev.some((s) => s.placeId === manualStop.placeId)
        ? prev
        : [...prev, { placeId: manualStop.placeId, label: manualStop.label, minutes: 30, source: "manual" }],
    );
    setManualStop(null);
  };

  const removeStop = (placeId: string) =>
    setStops((prev) => prev.filter((s) => s.placeId !== placeId));

  const move = (index: number, dir: -1 | 1) =>
    setStops((prev) => {
      const next = prev.slice();
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const setMinutes = (placeId: string, minutes: number) =>
    setStops((prev) =>
      prev.map((s) => (s.placeId === placeId ? { ...s, minutes: clampMinutes(minutes) } : s)),
    );

  const stopMinutes = stops.reduce((t, s) => t + s.minutes, 0);

  const continueToBooking = () => {
    if (!pickup || !dropoff) {
      setError("Choose a start and end point from the suggestions.");
      return;
    }
    if (sameEndpoints) {
      setError("Start and end points must be different.");
      return;
    }
    if (!date) {
      setError("Pick the date you want to travel.");
      return;
    }
    const p = new URLSearchParams();
    p.set("pickupPlaceId", pickup.placeId);
    p.set("pickupLabel", pickup.label);
    p.set("dropoffPlaceId", dropoff.placeId);
    p.set("dropoffLabel", dropoff.label);
    p.set("date", date);
    p.set("time", time || "09:00");
    p.set("passengers", "2");
    p.set("luggage", "2");
    p.set("mode", "quote");
    if (stops.length) {
      p.set(
        "stops",
        stops.map((s) => `${s.placeId}::${encodeURIComponent(s.label)}::${s.minutes}`).join("|"),
      );
    }
    if (matchedSlug) p.set("templateSlug", matchedSlug);
    navigate({ to: "/book", search: { q: p.toString() } });
  };

  return (
    <div
      ref={panelRef}
      className="rounded-3xl border border-[var(--gold)]/30 bg-[var(--surface)] p-5 sm:p-7 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold-ink)]">
            <Wand2 className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold">Build your own tour</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Tell us where you start and finish. If we already run that tour we'll load the itinerary
              for you to edit — otherwise we'll suggest famous stops along the way.
            </p>
          </div>
        </div>
        <Button
          variant={open ? "outline" : "default"}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Close builder" : "Create a custom tour"}
        </Button>
      </div>

      {open && (
        <div className="mt-6 space-y-6">
          {/* Route */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ct-pickup">Start point</Label>
              <PlaceAutocomplete
                id="ct-pickup"
                value={pickup}
                onChange={setPickup}
                placeholder="e.g. Edinburgh city centre"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ct-dropoff">End point</Label>
              <PlaceAutocomplete
                id="ct-dropoff"
                value={dropoff}
                onChange={setDropoff}
                placeholder="e.g. Loch Ness"
                className="mt-1.5"
                hideAttribution
              />
            </div>
            <div>
              <Label htmlFor="ct-date">Travel date</Label>
              <Input
                id="ct-date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ct-time">Pickup time</Label>
              <Input
                id="ct-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {sameEndpoints && (
            <p className="text-sm text-destructive">Start and end points must be different.</p>
          )}

          {/* Match state */}
          {routeReady && matchQuery.isFetching && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking whether we already run this tour…
            </p>
          )}
          {routeReady && !matchQuery.isFetching && matched && (
            <div className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-[var(--gold-ink)]" />
                We run this route: <span className="font-semibold">{matched.name}</span>
                {matchQuery.data?.kind === "reversed" && " (reversed)"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Its recommended stops are loaded below. Add, remove or re-order anything — your quote
                updates from your final itinerary.
              </p>
            </div>
          )}
          {routeReady && !matchQuery.isFetching && !matched && (
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
              <p className="text-sm font-medium">No ready-made tour for this pair — let's build one.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {corridorQuery.data?.corridor
                  ? "Below are famous points near your route. Tick the ones you'd like to stop at, or search / add your own."
                  : "Search our curated stops below, or add any place manually."}
              </p>
            </div>
          )}

          {/* Itinerary */}
          {routeReady && (
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">Your itinerary</h3>
                <span className="text-xs text-muted-foreground">
                  {stops.length} stop{stops.length === 1 ? "" : "s"} · {formatMinutes(stopMinutes)} at stops
                </span>
              </div>

              <ol className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-[var(--gold-ink)]" />
                  <span className="font-medium">{pickup?.label}</span>
                  <span className="text-xs text-muted-foreground">start</span>
                </li>
                {stops.map((s, i) => (
                  <li
                    key={s.placeId}
                    className="rounded-xl border border-white/10 bg-[var(--surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--gold)]/20 text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {s.source === "tour" ? "from tour" : s.source === "suggested" ? "suggested" : "your stop"}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button" size="icon" variant="ghost" aria-label="Move earlier"
                          onClick={() => move(i, -1)} disabled={i === 0}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button" size="icon" variant="ghost" aria-label="Move later"
                          onClick={() => move(i, 1)} disabled={i === stops.length - 1}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button" size="icon" variant="ghost" aria-label={`Remove ${s.label}`}
                          onClick={() => removeStop(s.placeId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Label htmlFor={`ct-min-${s.placeId}`} className="text-xs text-muted-foreground">
                        Time here
                      </Label>
                      <input
                        id={`ct-min-${s.placeId}`}
                        type="range"
                        min={0}
                        max={180}
                        step={MIN_STEP}
                        value={s.minutes}
                        onChange={(e) => setMinutes(s.placeId, Number(e.target.value))}
                        className="h-1.5 flex-1 accent-[var(--gold)]"
                      />
                      <span className="w-20 text-right text-xs font-medium">{formatMinutes(s.minutes)}</span>
                    </div>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-[var(--gold-ink)]" />
                  <span className="font-medium">{dropoff?.label}</span>
                  <span className="text-xs text-muted-foreground">finish</span>
                </li>
              </ol>

              {stops.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No stops yet — a direct private transfer is fine too. Add stops below to turn it into a tour.
                </p>
              )}
            </div>
          )}

          {/* Suggestions */}
          {routeReady && (
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">Add stops</h3>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={poiQuery}
                    onChange={(e) => setPoiQuery(e.target.value)}
                    placeholder="Search castles, lochs, distilleries…"
                    className="pl-9"
                    aria-label="Search stops"
                  />
                  {poiQuery && (
                    <button
                      type="button"
                      aria-label="Clear stop search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setPoiQuery("")}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {tourExtras.length > 0 && debounced.length < 2 && (
                <>
                  <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                    Optional stops on {matched?.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tourExtras.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addPoi(p, "suggested")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1.5 text-xs font-medium hover:bg-[var(--gold)]/20"
                      >
                        <Plus className="size-3.5" /> {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                {debounced.length >= 2 ? "Search results" : "Famous points near your route"}
              </p>
              {(corridorQuery.isFetching || poiSearchQuery.isFetching) && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Finding stops…
                </p>
              )}
              {!corridorQuery.isFetching && !poiSearchQuery.isFetching && suggestions.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing to suggest here — add your own stop below and we'll price it.
                </p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPoi(p, "suggested")}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-white/10 bg-[var(--surface)] p-3 text-left transition",
                      "hover:border-[var(--gold)]/50 hover:bg-[var(--gold)]/5",
                    )}
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--gold)]/20">
                      <Plus className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[
                          p.category?.replace(/_/g, " "),
                          p.detour_miles != null ? `${p.detour_miles} mi off route` : null,
                          p.recommended_visit_minutes ? `${p.recommended_visit_minutes} min suggested` : null,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <Label htmlFor="ct-manual">Add any other place manually</Label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <PlaceAutocomplete
                      id="ct-manual"
                      value={manualStop}
                      onChange={setManualStop}
                      placeholder="Search any UK place to stop at"
                      hideAttribution
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={addManual} disabled={!manualStop}>
                    <Plus className="size-4 mr-1" /> Add stop
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={continueToBooking} disabled={!routeReady}>
              Get price & continue <ArrowRight className="size-4 ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Live quote on the next step — mileage, stop time and vehicle all priced before you pay.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
