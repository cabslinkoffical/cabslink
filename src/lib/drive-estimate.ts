/**
 * Rough road-journey estimate from straight-line distance between two points.
 * x1.3 road factor, ~65 km/h average. Always presented as an estimate; the
 * booking quote shows the real routed distance.
 */
export function estimateDrive(lat: number, lng: number, o: { lat: number; lng: number }) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const a =
    Math.sin(toR(lat - o.lat) / 2) ** 2 +
    Math.cos(toR(o.lat)) * Math.cos(toR(lat)) * Math.sin(toR(lng - o.lng) / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a)) * 1.3;
  const miles = Math.max(1, Math.round(km * 0.621));
  const mins = Math.max(10, Math.round(((km / 65) * 60) / 5) * 5);
  return { miles, mins };
}

export function fmtMins(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Terminal coordinates of the two main Scottish airports. */
export const MAIN_AIRPORTS = [
  { name: "Edinburgh Airport", lat: 55.95, lng: -3.3725 },
  { name: "Glasgow Airport", lat: 55.8719, lng: -4.4331 },
] as const;
