import { describe, expect, it } from "vitest";
import { priceCoverLines, priceCoverSummary, tourIncludesTickets, tourPriceCovers } from "@/lib/tour-price-covers";

const tiers = [
  { hours: 8, included_miles: 160 },
  { hours: 10, included_miles: 200 },
];
const cls = { hourly_rate: 50, extra_hour_rate: 45 };

describe("tour price covers", () => {
  it("fixed price: uses the tour's own hours, included miles and the extra-hour rate", () => {
    const c = tourPriceCovers({ row: { default_duration_hours: 8, included_miles: 150 }, fromClass: cls, hasFixedPrice: true, tiers });
    expect(c).toEqual({ hours: 8, includedMiles: 150, extraHourPence: 4500, ticketsIncluded: false });
  });

  it("automatic price: measured route miles count as included when larger", () => {
    const c = tourPriceCovers({
      row: { default_duration_hours: 8, included_miles: 160, price_mode: "auto", auto_price_route_miles: 182.4 },
      fromClass: cls, hasFixedPrice: true, tiers,
    });
    expect(c.includedMiles).toBe(182);
  });

  it("no fixed price: hour-tier miles and the hourly rate for extra hours", () => {
    const c = tourPriceCovers({ row: { default_duration_hours: 10, included_miles: 120 }, fromClass: cls, hasFixedPrice: false, tiers });
    expect(c.includedMiles).toBe(200);
    expect(c.extraHourPence).toBe(5000);
  });

  it("leaves unset values out instead of guessing", () => {
    const c = tourPriceCovers({ row: { default_duration_hours: null }, fromClass: null, hasFixedPrice: false, tiers });
    const lines = priceCoverLines(c).map((l) => l.text);
    expect(lines).toEqual(["Price per vehicle, not per person", "Entry tickets not included"]);
    expect(priceCoverSummary(c)).toBe("per vehicle");
  });

  it("entry tickets count as included only when the tour data says so", () => {
    expect(tourIncludesTickets(["Private driver & vehicle", "Fuel & parking"], null)).toBe(false);
    expect(tourIncludesTickets(["Castle entry tickets"], null)).toBe(true);
    expect(tourIncludesTickets([], "Admission to Stirling Castle")).toBe(true);
  });

  it("full list for a fixed-price 8-hour tour", () => {
    const c = tourPriceCovers({ row: { default_duration_hours: 8, included_miles: 160 }, fromClass: cls, hasFixedPrice: true, tiers });
    expect(priceCoverLines(c).map((l) => l.text)).toEqual([
      "8 hours with your driver",
      "Up to 160 miles included",
      "Price per vehicle, not per person",
      "Entry tickets not included",
      "Extra hours £45 per hour",
    ]);
    expect(priceCoverSummary(c)).toBe("8 hrs · 160 miles · per vehicle");
  });
});
