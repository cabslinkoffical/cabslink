import { describe, expect, it } from "vitest";
import { journeyFare, returnScheduleProblem } from "@/lib/return-journey";

describe("Return journey editing", () => {
  it("includes both legs in the vehicle fare without changing its base", () => {
    expect(journeyFare(320, 1, true)).toBe(640);
    expect(journeyFare(320, 2, true)).toBe(1280);
    expect(journeyFare(320, 1, false)).toBe(320);
  });
  it("rejects the default return timestamp equal to pickup", () => {
    expect(returnScheduleProblem({ return_journey: true, pickupDate: "2026-11-18", pickupTime: "10:21", returnDate: "2026-11-18", returnTime: "10:21" })).toBe("Your return journey must be after your outbound pickup.");
  });
  it("accepts a later same-day return", () => {
    expect(returnScheduleProblem({ return_journey: true, pickupDate: "2026-11-18", pickupTime: "10:21", returnDate: "2026-11-18", returnTime: "18:21" })).toBeNull();
  });
  it("requires a schedule only while return is enabled", () => {
    expect(returnScheduleProblem({ return_journey: true, pickupDate: "2026-11-18", pickupTime: "10:21" })).toBe("Please choose a date and time for your return journey.");
    expect(returnScheduleProblem({ return_journey: false, pickupDate: "2026-11-18", pickupTime: "10:21" })).toBeNull();
  });
});