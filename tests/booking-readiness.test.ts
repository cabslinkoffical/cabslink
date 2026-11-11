import { describe, expect, it } from "vitest";
import { scenicBookingProblem } from "@/lib/booking-readiness";

const ready = { active: true, fetching: false, failed: false, quoted: true, vehicleAvailable: true, needsAcknowledgement: false };
describe("Scenic booking readiness", () => {
  it("blocks a failed stop quote rather than accepting the direct fare", () => {
    expect(scenicBookingProblem({ ...ready, failed: true })).toBe("We couldn't price this right now, please try again or call us");
  });
  it("blocks loading even when an old quote exists", () => {
    expect(scenicBookingProblem({ ...ready, fetching: true })).toBe("Please wait for your updated journey price.");
  });
  it("blocks a missing price", () => {
    expect(scenicBookingProblem({ ...ready, quoted: false })).toBe("Please wait for your updated journey price.");
  });
  it("blocks a class excluded from the updated journey", () => {
    expect(scenicBookingProblem({ ...ready, vehicleAvailable: false })).toBe("That vehicle isn't available for this journey. Please choose another class.");
  });
  it("requires acknowledgement after the service changes", () => {
    expect(scenicBookingProblem({ ...ready, needsAcknowledgement: true })).toBe("Please acknowledge the service change before continuing.");
  });
  it("allows a ready scenic quote or a direct journey without scenic data", () => {
    expect(scenicBookingProblem(ready)).toBeNull();
    expect(scenicBookingProblem({ ...ready, active: false, quoted: false, fetching: true, failed: true })).toBeNull();
  });
});