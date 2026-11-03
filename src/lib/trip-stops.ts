export type TripStop = { place_id: string; label: string; minutes: number; category: string | null };

/**
 * Stops sent for pricing and booking when sightseeing stops are chosen:
 * plain typed stops first (in the customer's order), then the sightseeing
 * stops. Typed stops that carry minutes are seeded tour stops already in the
 * sightseeing list, and duplicates of a chosen sightseeing stop are skipped.
 */
export function mergeTripStops(
  typed: Array<{ placeId: string; label: string; minutes?: number }>,
  sightseeing: Array<{ place_id: string; label: string; minutes: number; category?: string | null }>,
): TripStop[] {
  if (sightseeing.length === 0) return [];
  const chosen = new Set(sightseeing.map((s) => s.place_id));
  return [
    ...typed
      .filter((s) => s.minutes === undefined && !chosen.has(s.placeId))
      .map((s) => ({ place_id: s.placeId, label: s.label, minutes: 0, category: null })),
    ...sightseeing.map((s) => ({ ...s, category: s.category ?? null })),
  ];
}
