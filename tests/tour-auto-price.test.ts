import { describe, expect, it } from "vitest";
import { autoTourPrice } from "@/lib/tour-quote";

describe("automatic tour price (hourly rate × hours + route miles)", () => {
  it("adds hours and route miles", () => {
    // £50/hour × 8 hours + 120 miles × £1.50 = £400 + £180
    expect(autoTourPrice({ hourlyRate: 50, hours: 8, routeMiles: 120, mileRate: 1.5 })).toBe(580);
  });
  it("charges hours only when the vehicle has no mile rate", () => {
    expect(autoTourPrice({ hourlyRate: 55, hours: 10, routeMiles: 200, mileRate: null })).toBe(550);
  });
  it("gives no price for a vehicle without an hourly rate", () => {
    expect(autoTourPrice({ hourlyRate: null, hours: 8, routeMiles: 100, mileRate: 2 })).toBeNull();
    expect(autoTourPrice({ hourlyRate: 0, hours: 8, routeMiles: 100, mileRate: 2 })).toBeNull();
  });
  it("rounds to pence", () => {
    expect(autoTourPrice({ hourlyRate: 33.333, hours: 3, routeMiles: 10.05, mileRate: 1.1 })).toBe(111.06);
  });
});
