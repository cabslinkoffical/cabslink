import { describe, expect, it } from "vitest";
import { buildAdvisorResult, suitableAdvisorVehicles, type TransferNeeds, type AdvisorVehicle } from "../src/lib/transfer-advisor";

const needs: TransferNeeds = { pickup: "Edinburgh Airport", dropoff: "St Andrews", passengers: 4, luggage: 3, handLuggage: 2, returnTrip: true, childSeats: false, wheelchair: false, meetGreet: true, service: "airport", vehicleId: "small" };
const vehicles: AdvisorVehicle[] = [
  { id: "small", name: "Saloon", passengers: 3, large_luggage: 2, cabin_bags: 2, child_seats_supported: false, wheelchair_accessible: false },
  { id: "van", name: "Eight-Seater Van", passengers: 8, large_luggage: 8, cabin_bags: 8, child_seats_supported: true, wheelchair_accessible: false },
];
describe("AI transfer recommendation safeguards", () => {
  it("never accepts a model-selected vehicle that is too small", () => {
    expect(buildAdvisorResult(needs, vehicles).vehicle?.id).toBe("van");
  });
  it("asks for passenger confirmation instead of inventing a count", () => {
    const result = buildAdvisorResult({ ...needs, passengers: null }, vehicles);
    expect(result.vehicle).toBeNull();
    expect(result.questions).toContain("How many passengers, including children, are travelling?");
  });
  it("does not infer missing luggage counts as zero", () => {
    expect(suitableAdvisorVehicles({ ...needs, luggage: null }, vehicles)).toEqual([]);
  });
  it("requires a child-seat-capable class for requested child seats", () => {
    expect(suitableAdvisorVehicles({ ...needs, passengers: 2, luggage: 1, childSeats: true }, vehicles).map((v) => v.id)).toEqual(["van"]);
  });
  it("does not recommend a non-accessible class for a wheelchair request", () => {
    expect(buildAdvisorResult({ ...needs, wheelchair: true }, vehicles).needsTeam).toBe(true);
  });
  it("sends an oversized party to the team rather than a smaller vehicle", () => {
    expect(buildAdvisorResult({ ...needs, passengers: 9 }, vehicles).needsTeam).toBe(true);
  });
  it("carries locations and return intent without inventing dates or confirming passengers", () => {
    const q = new URLSearchParams(buildAdvisorResult(needs, vehicles).bookingQuery);
    expect(q.get("pickupText")).toBe("Edinburgh Airport");
    expect(q.get("dropoffText")).toBe("St Andrews");
    expect(q.get("ret")).toBe("1");
    expect(q.has("passengers")).toBe(false);
    expect(q.has("date")).toBe(false);
    expect(q.has("pickupPlaceId")).toBe(false);
  });
});