/**
 * Flight number rule shared by the booking form and the server: the flight
 * number is always optional (owner decision, Nov 2026). Airport pickups
 * still show the flight-tracking hint via isAirportPickup.
 */

const AIRPORT_PICKUP = /\b(airport|aeroporto?|heathrow|gatwick|stansted)\b/i;

/** True when the pickup address is an airport. */
export function isAirportPickup(pickupLabel: string | null | undefined): boolean {
  return !!pickupLabel && AIRPORT_PICKUP.test(pickupLabel);
}

/** The flight number is optional for every pickup, so this never errors. */
export function flightNumberError(
  _pickupLabel: string | null | undefined,
  _flightNumber: string | null | undefined,
): string | null {
  return null;
}
