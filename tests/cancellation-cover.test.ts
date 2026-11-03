import { describe, expect, it } from "vitest";
import { coverDelta, coverLabel, parseCover } from "@/lib/cancellation-cover";
import { refundTierFor } from "@/lib/manage-booking.functions";

const cfg = { nonRefundablePercent: 5, nonRefundableMinPence: 200, flexiblePercent: 10, flexibleMinPence: 300 };

describe("cancellation cover price change", () => {
  it("non-refundable saves the percent, at least the minimum", () => {
    expect(coverDelta("non_refundable", 100, cfg)).toBe(-5);
    expect(coverDelta("non_refundable", 20, cfg)).toBe(-2);
  });
  it("flexible adds the percent, at least the minimum", () => {
    expect(coverDelta("flexible", 100, cfg)).toBe(10);
    expect(coverDelta("flexible", 20, cfg)).toBe(3);
  });
  it("standard changes nothing", () => {
    expect(coverDelta("standard", 100, cfg)).toBe(0);
  });
});

describe("cancellation cover label", () => {
  it("shows the cover and saved amount", () => {
    expect(coverLabel("flexible", 4.2)).toBe("Flexible (+£4.20)");
    expect(coverLabel("non_refundable", -2)).toBe("Non-refundable (−£2.00)");
    expect(coverLabel("standard", 0)).toBe("Standard");
  });
  it("is empty when nothing was recorded", () => {
    expect(coverLabel(null, null)).toBeNull();
    expect(parseCover("anything")).toBeNull();
  });
});

describe("refund entitlement follows the chosen cover", () => {
  const base = { allowed: true, paymentStatus: "paid", withinBookingGrace: false };
  it("non-refundable paid booking gets no refund, even days ahead", () => {
    expect(refundTierFor({ ...base, cover: "non_refundable", hoursUntilPickup: 72 })).toBe("no_refund");
  });
  it("non-refundable unpaid booking has nothing to refund", () => {
    expect(refundTierFor({ ...base, paymentStatus: "unpaid", cover: "non_refundable", hoursUntilPickup: 72 })).toBe("unpaid");
  });
  it("flexible gets a full refund up to 1 hour before pickup", () => {
    expect(refundTierFor({ ...base, cover: "flexible", hoursUntilPickup: 2 })).toBe("full");
    expect(refundTierFor({ ...base, cover: "flexible", hoursUntilPickup: 0.5 })).toBe("partial");
  });
  it("standard gets a full refund 24+ hours before pickup, otherwise a partial claim", () => {
    expect(refundTierFor({ ...base, cover: "standard", hoursUntilPickup: 30 })).toBe("full");
    expect(refundTierFor({ ...base, cover: "standard", hoursUntilPickup: 10 })).toBe("partial");
    expect(refundTierFor({ ...base, cover: null, hoursUntilPickup: 10 })).toBe("partial");
  });
});
