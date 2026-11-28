import { z } from "zod";
import { classCapacity, vehicleFits, type ClassCapacityRow } from "@/lib/vehicle-capacity";

const count = z.number().int().min(0).max(60).nullable();
export const transferNeedsSchema = z.object({
  pickup: z.string().max(180),
  dropoff: z.string().max(180),
  passengers: z.number().int().min(1).max(60).nullable(),
  luggage: count,
  handLuggage: count,
  returnTrip: z.boolean(),
  childSeats: z.boolean(),
  wheelchair: z.boolean(),
  meetGreet: z.boolean(),
  service: z.enum(["airport", "executive", "group", "other"]),
  vehicleId: z.string().max(80),
});
export type TransferNeeds = z.infer<typeof transferNeedsSchema>;
export type AdvisorVehicle = ClassCapacityRow & {
  id: string; name: string; child_seats_supported: boolean; wheelchair_accessible: boolean;
};

export function suitableAdvisorVehicles(needs: TransferNeeds, vehicles: AdvisorVehicle[]) {
  if (needs.passengers === null || needs.luggage === null || needs.handLuggage === null) return [];
  const request = { passengers: needs.passengers, luggage: needs.luggage, handLuggage: needs.handLuggage };
  return vehicles.filter((v) => vehicleFits(classCapacity(v), 1, request)
    && (!needs.childSeats || v.child_seats_supported)
    && (!needs.wheelchair || v.wheelchair_accessible));
}

export function buildAdvisorResult(needs: TransferNeeds, vehicles: AdvisorVehicle[]) {
  const suitable = suitableAdvisorVehicles(needs, vehicles);
  const vehicle = suitable.find((v) => v.id === needs.vehicleId) ?? suitable[0] ?? null;
  const questions: string[] = [];
  if (!needs.pickup) questions.push("Where should we pick you up?");
  if (!needs.dropoff) questions.push("Where are you travelling to?");
  if (needs.passengers === null) questions.push("How many passengers, including children, are travelling?");
  if (needs.luggage === null) questions.push("How many large suitcases are you bringing?");
  if (needs.handLuggage === null) questions.push("How many cabin bags are you bringing?");
  const completeCounts = needs.passengers !== null && needs.luggage !== null && needs.handLuggage !== null;
  const q = new URLSearchParams();
  if (needs.pickup) q.set("pickupText", needs.pickup);
  if (needs.dropoff) q.set("dropoffText", needs.dropoff);
  // Extracted counts remain advisory: booking explicitly confirms passengers.
  if (needs.luggage !== null) q.set("luggage", String(needs.luggage));
  if (needs.handLuggage !== null) q.set("handLuggage", String(needs.handLuggage));
  q.set("ret", needs.returnTrip ? "1" : "0");
  return {
    needs, questions, bookingQuery: q.toString(),
    service: needs.service === "executive" ? "Executive airport transfer" : needs.service === "group" ? "Group airport transfer" : "Private airport transfer",
    outsideScope: needs.service === "other",
    vehicle: vehicle ? { id: vehicle.id, name: vehicle.name, capacity: classCapacity(vehicle) } : null,
    needsTeam: completeCounts && !vehicle,
  };
}
export type AdvisorResult = ReturnType<typeof buildAdvisorResult>;