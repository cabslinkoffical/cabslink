/**
 * Browser-safe rules for the day-tour booking form: which steps it shows,
 * which vehicles can carry the party, and how a ready-made tour's stops keep
 * the tour's own order when optional stops are taken off and put back.
 */

export type WizardStepId = "tour" | "when" | "stops" | "vehicle" | "details";

/** How many suggested places show before the "More places" toggle. */
export const VISIBLE_SUGGESTION_COUNT = 6;

export function visibleTourSuggestions<T>(suggestions: T[], expanded: boolean): T[] {
  return expanded ? suggestions : suggestions.slice(0, VISIBLE_SUGGESTION_COUNT);
}

/** Ready-made tours skip the stops step (their stops are set); hourly hire has no tour choice. */
export function wizardSteps(kind: "tour" | "hourly", mode: "premade" | "custom"): WizardStepId[] {
  if (kind === "hourly") return ["when", "stops", "vehicle", "details"];
  return mode === "premade" ? ["tour", "when", "vehicle", "details"] : ["tour", "when", "stops", "vehicle", "details"];
}

export const STEP_LABELS: Record<WizardStepId, string> = {
  tour: "Tour",
  when: "Date & pickup",
  stops: "Stops",
  vehicle: "Vehicle & price",
  details: "Details & pay",
};

export type FleetClass = { id: string; max_passengers: number | null; max_luggage: number | null };

/** One vehicle carries the party only when it has the seats AND the suitcase space. */
export function fitsParty(c: FleetClass, passengers: number, luggage: number): boolean {
  return Number(c.max_passengers ?? 0) >= passengers && Number(c.max_luggage ?? 0) >= luggage;
}

export type TemplateStop = {
  poi_id: string;
  place_id: string;
  name: string;
  stop_order: number;
  recommended_visit_minutes: number | null;
  mandatory: boolean;
  default_selected: boolean;
};

export type ChosenStop = { poiId: string | null; placeId: string; name: string; dwellMinutes: number | null };

/** The chosen ready-made stops, always in the tour's own driving order. */
export function templateStopsInOrder(stops: TemplateStop[], chosenPoiIds: ReadonlySet<string>, minStopMinutes: number): ChosenStop[] {
  return stops
    .filter((s) => s.mandatory || chosenPoiIds.has(s.poi_id))
    .sort((a, b) => a.stop_order - b.stop_order)
    .map((s) => ({
      poiId: s.poi_id,
      placeId: s.place_id,
      name: s.name,
      dwellMinutes: Math.max(minStopMinutes, s.recommended_visit_minutes ?? minStopMinutes),
    }));
}

/** Hour choices a ready-made tour allows: its own length, or the bookable tiers inside its range. */
export function tourHourChoices(
  tour: { default_duration_hours: number | null; min_duration_hours: number | null; max_duration_hours: number | null },
  tierHours: number[],
): number[] {
  const def = tour.default_duration_hours;
  const min = tour.min_duration_hours ?? def;
  const max = tour.max_duration_hours ?? def;
  const inRange = tierHours.filter((h) => (min == null || h >= min) && (max == null || h <= max));
  const all = new Set(inRange);
  if (def != null) all.add(def);
  return [...all].sort((a, b) => a - b);
}

/** "09:00" plus 8 hours -> "17:00". */
export function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map((v) => Number(v));
  const total = ((h ?? 0) * 60 + (m ?? 0) + Math.round(hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Smallest allowed length containing road time, visits and the configured pickup buffer.
 * A ready-made tour never drops below its default sold length. No fitting
 * option returns null rather than inventing a duration beyond admin limits.
 */
export function automaticTourHours(choices: number[], baseHours: number, driveMinutes: number, dwellMinutes: number[], minimumStopMinutes: number, pickupBufferMinutes: number): number | null {
  // The existing quote engine calls less than 20 minutes' slack "tight".
  const needed = driveMinutes + pickupBufferMinutes + 20 + dwellMinutes.reduce((t, m) => t + Math.max(minimumStopMinutes, m), 0);
  return [...choices].sort((a, b) => a - b).find((h) => h >= baseHours && h * 60 >= needed) ?? null;
}
