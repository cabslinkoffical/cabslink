import { describe, it, expect } from "vitest";
import { buildBookingDetails } from "@/lib/booking-details";

describe("admin booking details", () => {
  it("shows the return leg date and time", () => {
    const d = buildBookingDetails({ return_journey: true, return_date: "2026-11-16", return_time: "14:30" });
    expect(d.returnLeg?.date).toBe("2026-11-16");
    expect(d.returnLeg?.time).toMatch(/2:30/);
  });
  it("hides return when not booked", () => {
    expect(buildBookingDetails({ return_journey: false, return_date: "2026-11-16" }).returnLeg).toBeNull();
  });
  it("lists transfer stops and tour stops", () => {
    expect(buildBookingDetails({ selected_pois: [{ label: "Stirling Castle", minutes: 30 }] }).stops).toEqual(["Stirling Castle (30 min)"]);
    expect(buildBookingDetails({ tour_stops: ["The Kelpies", "Falkirk Wheel"] }).stops).toEqual(["The Kelpies", "Falkirk Wheel"]);
  });
  it("lists every vehicle and chosen extra", () => {
    const d = buildBookingDetails({
      tour_vehicles: [{ name: "Executive MPV", passengers: 6, luggage: 4, price: 320 }, { name: "Saloon", passengers: 2, luggage: 1, price: 280 }],
      pricing_snapshot: { chosen_extras: [{ name: "Extra waiting", quantity: 2 }] },
      booked_hours: "8",
    });
    expect(d.vehicles.map((v) => v.name)).toEqual(["Executive MPV", "Saloon"]);
    expect(d.extras).toEqual([{ name: "Extra waiting", quantity: 2 }]);
    expect(d.hours).toBe(8);
  });
});
