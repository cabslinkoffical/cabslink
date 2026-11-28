import { describe, it, expect } from "vitest";
import { buildBookingDetails, customerDetailRows } from "@/lib/booking-details";

describe("admin booking details", () => {
  it("makes the saved return, stops and extras available to customer pages and downloads", () => {
    const details = buildBookingDetails({ return_journey: true, return_date: "2026-11-30", return_time: "14:30", selected_pois: [{ label: "Stirling Castle", minutes: 30 }], pricing_snapshot: { chosen_extras: [{ name: "Extra waiting", quantity: 2 }] } });
    const rows = customerDetailRows(details);
    expect(rows.find(r => r.label === "Return pickup")?.value).toContain("2026-11-30");
    expect(rows.find(r => r.label === "Stops")?.value).toBe("Stirling Castle (30 min)");
    expect(rows.find(r => r.label === "Booked extras")?.value).toBe("Extra waiting × 2");
  });
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
