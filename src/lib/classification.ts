/**
 * Service classification — pure, isomorphic.
 * Determines whether a journey is a direct transfer, a transfer with a
 * quick stop, a sightseeing transfer, or a private tour based on selected
 * POIs, total planned stop time, stop count, and configurable thresholds.
 *
 * Fuel / toilet / passenger-pickup stops (category === "comfort_stop" or
 * "fuel_stop") do NOT count toward sightseeing thresholds.
 */

export type ServiceType =
  | "direct_transfer"
  | "transfer_with_stop"
  | "sightseeing_transfer"
  | "private_tour";

export type ClassificationStop = {
  place_id: string;
  minutes: number;
  category?: string | null;
};

export type ClassificationThresholds = {
  /** Minutes of planned attraction time above which a journey becomes a sightseeing transfer. */
  sightseeingThresholdMinutes: number;
  /** Minutes of planned attraction time above which a journey becomes a private tour. */
  tourThresholdMinutes: number;
  /** Attraction stop count above which a journey becomes a private tour. */
  tourThresholdStops: number;
};

export type ClassificationResult = {
  service_type: ServiceType;
  reason: string;
  attraction_stops: number;
  planned_attraction_minutes: number;
};

const NON_ATTRACTION_CATEGORIES = new Set([
  "comfort_stop",
  "fuel_stop",
  "toilet_stop",
  "passenger_pickup",
]);

function isAttraction(stop: ClassificationStop): boolean {
  const c = (stop.category ?? "").toLowerCase();
  return !NON_ATTRACTION_CATEGORIES.has(c);
}

export function classifyService(
  stops: readonly ClassificationStop[],
  thresholds: ClassificationThresholds,
): ClassificationResult {
  const attractionStops = stops.filter(isAttraction);
  const attractionMinutes = attractionStops.reduce(
    (sum, s) => sum + Math.max(0, Number(s.minutes) || 0),
    0,
  );

  if (stops.length === 0) {
    return {
      service_type: "direct_transfer",
      reason: "No stops selected",
      attraction_stops: 0,
      planned_attraction_minutes: 0,
    };
  }

  // Private tour if EITHER count OR minutes cross the tour threshold.
  if (
    attractionStops.length >= thresholds.tourThresholdStops ||
    attractionMinutes >= thresholds.tourThresholdMinutes
  ) {
    return {
      service_type: "private_tour",
      reason:
        attractionStops.length >= thresholds.tourThresholdStops
          ? `${attractionStops.length} attraction stops (tour threshold ${thresholds.tourThresholdStops})`
          : `${attractionMinutes} planned attraction minutes (tour threshold ${thresholds.tourThresholdMinutes})`,
      attraction_stops: attractionStops.length,
      planned_attraction_minutes: attractionMinutes,
    };
  }

  if (attractionMinutes >= thresholds.sightseeingThresholdMinutes) {
    return {
      service_type: "sightseeing_transfer",
      reason: `${attractionMinutes} planned attraction minutes (sightseeing threshold ${thresholds.sightseeingThresholdMinutes})`,
      attraction_stops: attractionStops.length,
      planned_attraction_minutes: attractionMinutes,
    };
  }

  // At least one stop, but total attraction time below sightseeing threshold.
  return {
    service_type: "transfer_with_stop",
    reason: attractionStops.length === 0
      ? "Only comfort stops selected"
      : `${attractionMinutes} planned attraction minutes below sightseeing threshold`,
    attraction_stops: attractionStops.length,
    planned_attraction_minutes: attractionMinutes,
  };
}
