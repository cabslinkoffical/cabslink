/**
 * Flight number rule shared by the booking form and the server: airport
 * pickups must include a flight number so the team can track the flight;
 * every other pickup keeps it optional.
 */
import { FACT_TEXT } from "@/lib/site-facts";

const AIRPORT_PICKUP = /\b(airport|aeroporto?|heathrow|gatwick|stansted)\b/i;

/** True when the pickup address is an airport. */
export function isAirportPickup(pickupLabel: string | null | undefined): boolean {
  return !!pickupLabel && AIRPORT_PICKUP.test(pickupLabel);
}

/** Error message when an airport pickup has no flight number, otherwise null. */
export function flightNumberError(
  pickupLabel: string | null | undefined,
  flightNumber: string | null | undefined,
): string | null {
  if (!isAirportPickup(pickupLabel)) return null;
  return (flightNumber ?? "").trim() ? null : FACT_TEXT.flightNumberRequired;
}
