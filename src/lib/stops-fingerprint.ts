/**
 * Stops fingerprint — pure, isomorphic.
 *
 * Deterministic SHA-256 over pickup, destination, route mode and the ORDERED
 * list of `place_id:minutes` pairs. Any change to a selected stop, its
 * duration, its position, or the route mode changes the fingerprint. The
 * server stores this on the quote and re-verifies it at booking time.
 */

export type FingerprintStop = { place_id: string; minutes: number };

export type FingerprintInput = {
  pickupPlaceId: string;
  destinationPlaceId: string;
  routeMode: "direct" | "scenic" | "optimised";
  stops: readonly FingerprintStop[];
};

/**
 * Canonical string form. Exposed for tests and for callers that only need
 * change detection (equality of two canonical strings is equivalent to
 * equality of two fingerprints).
 */
export function canonicalStopsPayload(input: FingerprintInput): string {
  const stops = input.stops.map(
    (s) => `${(s.place_id ?? "").trim()}:${Math.max(0, Math.round(Number(s.minutes) || 0))}`,
  );
  return [
    "v1",
    (input.pickupPlaceId ?? "").trim(),
    (input.destinationPlaceId ?? "").trim(),
    input.routeMode,
    stops.join("|"),
  ].join("::");
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function stopsFingerprint(input: FingerprintInput): Promise<string> {
  const payload = canonicalStopsPayload(input);
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}
