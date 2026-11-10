/**
 * Turns a saved booking row into the full list of trip details staff need to
 * see — return leg, stops, vehicles, hours and every extra the customer chose.
 * Pure and browser-safe so every admin view shows the same facts.
 */
import { childSeatsLabel, parseChildSeats } from "@/lib/child-seats";
import { coverLabel } from "@/lib/cancellation-cover";
import { formatTime12 } from "@/lib/time-format";

type JsonLike = string | number | boolean | null | JsonLike[] | { [k: string]: JsonLike };

export type BookingDetailSource = {
  service_type?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  return_journey?: boolean | null;
  return_date?: string | null;
  return_time?: string | null;
  passengers?: number | null;
  luggage?: number | null;
  hand_luggage?: number | null;
  vehicle_type?: string | null;
  vehicle_count?: number | null;
  tour_vehicles?: JsonLike;
  tour_name?: string | null;
  tour_stops?: JsonLike;
  selected_pois?: JsonLike;
  booked_hours?: number | string | null;
  hourly_hours?: number | null;
  distance_miles?: number | string | null;
  flight_number?: string | null;
  meet_greet?: boolean | null;
  child_seat?: boolean | null;
  child_seat_count?: number | null;
  child_seat_types?: JsonLike;
  cancellation_cover?: string | null;
  cancellation_cover_amount?: number | null;
  pricing_snapshot?: JsonLike;
};

export type DetailVehicle = { name: string; passengers: number | null; luggage: number | null; price: number | null };
export type DetailExtra = { name: string; quantity: number };

export type BookingDetails = {
  returnLeg: { date: string | null; time: string | null } | null;
  stops: string[];
  vehicles: DetailVehicle[];
  hours: number | null;
  extras: DetailExtra[];
  meetGreet: boolean;
  childSeats: string | null;
  cover: string | null;
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Stop names: sightseeing/via stops (objects with labels) or tour stop names. */
export function stopNames(selectedPois: unknown, tourStops: unknown): string[] {
  const out: string[] = [];
  const push = (s: unknown) => {
    const t = typeof s === "string" ? s.trim() : "";
    if (t && !out.includes(t)) out.push(t);
  };
  if (Array.isArray(tourStops)) tourStops.forEach(push);
  if (Array.isArray(selectedPois)) {
    for (const p of selectedPois) {
      if (p && typeof p === "object") {
        const o = p as { label?: JsonLike; minutes?: unknown };
        const label = typeof o.label === "string" ? o.label.trim() : "";
        const mins = num(o.minutes);
        if (label) push(mins && mins > 0 ? `${label} (${mins} min)` : label);
      }
    }
  }
  return out;
}

export function buildBookingDetails(b: BookingDetailSource): BookingDetails {
  const vehicles: DetailVehicle[] = Array.isArray(b.tour_vehicles)
    ? (b.tour_vehicles as any[]).filter((v) => v && typeof v === "object").map((v) => ({
        name: String(v.name ?? "Vehicle"),
        passengers: num(v.passengers),
        luggage: num(v.luggage),
        price: num(v.price),
      }))
    : [];
  const snap = (b.pricing_snapshot && typeof b.pricing_snapshot === "object" ? b.pricing_snapshot : {}) as { chosen_extras?: unknown };
  const extras: DetailExtra[] = Array.isArray(snap.chosen_extras)
    ? (snap.chosen_extras as any[])
        .filter((e) => e && typeof e.name === "string" && num(e.quantity) && num(e.quantity)! > 0)
        .map((e) => ({ name: e.name, quantity: num(e.quantity)! }))
    : [];
  const seatCount = Number(b.child_seat_count ?? 0);
  return {
    returnLeg: b.return_journey ? { date: b.return_date ?? null, time: b.return_time ? formatTime12(b.return_time) : null } : null,
    stops: stopNames(b.selected_pois, b.tour_stops),
    vehicles,
    hours: num(b.booked_hours) ?? num(b.hourly_hours),
    extras,
    meetGreet: !!b.meet_greet,
    childSeats: childSeatsLabel(parseChildSeats(b.child_seat_types), seatCount) ?? (b.child_seat ? "Yes" : null),
    cover: coverLabel(b.cancellation_cover ?? null, b.cancellation_cover_amount ?? null) ?? null,
  };
}
