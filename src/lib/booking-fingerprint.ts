/**
 * Canonical request fingerprint for booking idempotency binding.
 *
 * The fingerprint hashes only server-authoritative inputs — never
 * client-supplied price or distance. If a caller replays an idempotency
 * key with a different payload, the stored hash will not match and the
 * server refuses to return another booking's details.
 */
export type BookingFingerprintInput = {
  pickupPlaceId: string;
  destinationPlaceId: string;
  stops: Array<{ placeId: string }>;
  pickupDate: string;
  pickupTime: string;
  vehicleId: string;
  vehicleCount: number;
  passengers: number;
  luggage: number;
  email: string;
  phone: string;
  returnJourney: boolean;
  meetGreet: boolean;
  childSeat: boolean;
  childSeatCount?: number;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export function canonicalizeBookingInput(i: BookingFingerprintInput): string {
  const obj = {
    pickupPlaceId: i.pickupPlaceId.trim(),
    destinationPlaceId: i.destinationPlaceId.trim(),
    stops: i.stops.map((s) => s.placeId.trim()),
    pickupDate: i.pickupDate.trim(),
    pickupTime: i.pickupTime.trim(),
    vehicleId: i.vehicleId.trim(),
    vehicleCount: Math.max(1, i.vehicleCount | 0),
    passengers: i.passengers | 0,
    luggage: i.luggage | 0,
    email: norm(i.email),
    phone: i.phone.replace(/[\s-]/g, ""),
    returnJourney: !!i.returnJourney,
    meetGreet: !!i.meetGreet,
    childSeat: !!i.childSeat,
  };
  return JSON.stringify(obj);
}

export async function bookingRequestHash(i: BookingFingerprintInput): Promise<string> {
  const canonical = canonicalizeBookingInput(i);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
