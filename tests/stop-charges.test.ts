import { describe, it, expect } from "vitest";
import { computeStopCharges } from "@/lib/pricing";

describe("computeStopCharges", () => {
  it("returns zeros for no stops", () => {
    const r = computeStopCharges({ stops: [], includedStopMinutes: 30, pricePerExtra15minPence: 500 });
    expect(r.addedTotal).toBe(0);
    expect(r.breakdown).toEqual([]);
  });

  it("sums per-stop fees and parking in major units", () => {
    const r = computeStopCharges({
      stops: [
        { name: "A", minutes: 15, stop_fee_pence: 500, parking_fee_pence: 250 },
        { name: "B", minutes: 20, stop_fee_pence: 700, parking_fee_pence: 0 },
      ],
      includedStopMinutes: 30,
      pricePerExtra15minPence: 500,
    });
    expect(r.stopFeeTotal).toBe(12);
    expect(r.parkingTotal).toBe(2.5);
    expect(r.stopTimeTotal).toBe(0);
    expect(r.addedTotal).toBe(14.5);
  });

  it("bills extra minutes above included threshold per 15-min block", () => {
    const r = computeStopCharges({
      stops: [{ name: "Castle", minutes: 60, stop_fee_pence: 0, parking_fee_pence: 0 }],
      includedStopMinutes: 30,
      pricePerExtra15minPence: 500, // £5 per 15 min
    });
    // 30 overrun / 15 = 2 blocks × £5 = £10
    expect(r.stopTimeTotal).toBe(10);
    expect(r.extraMinutesTotal).toBe(30);
  });

  it("rounds partial extra minutes up to the next 15-min block", () => {
    const r = computeStopCharges({
      stops: [{ name: "X", minutes: 46, stop_fee_pence: 0, parking_fee_pence: 0 }],
      includedStopMinutes: 30,
      pricePerExtra15minPence: 400,
    });
    // 16 min overrun → 2 blocks × £4 = £8
    expect(r.stopTimeTotal).toBe(8);
  });

  it("adds a scenic/tour fee as its own line", () => {
    const r = computeStopCharges({
      stops: [{ name: "X", minutes: 20, stop_fee_pence: 0, parking_fee_pence: 0 }],
      includedStopMinutes: 30,
      pricePerExtra15minPence: 500,
      scenicFeePence: 2500,
    });
    expect(r.scenicFee).toBe(25);
    expect(r.breakdown.some((b) => b.kind === "scenic_fee")).toBe(true);
  });

  it("engine version bumped to 2026.08.1", async () => {
    const { ENGINE_VERSION } = await import("@/lib/pricing");
    expect(ENGINE_VERSION).toBe("2026.08.1");
  });
});
