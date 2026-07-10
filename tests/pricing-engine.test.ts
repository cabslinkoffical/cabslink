import { describe, it, expect } from "vitest";
import { runPricingEngine, ENGINE_VERSION, type PricingProfile } from "@/lib/pricing";

function baseProfile(overrides: Partial<PricingProfile> = {}): PricingProfile {
  return {
    id: "profile-1",
    vehicle_id: "veh-1",
    base_price: 0,
    via_price: 10,
    vehicle_add_price_enabled: false,
    time_extra_from: null,
    time_extra_to: null,
    time_extra_amount: 0,
    time_extra_type: "fixed",
    status: true,
    tiers: [],
    ...overrides,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

describe("pricing engine — Task 7 acceptance", () => {
  it("1) progressive mileage: 42 mi × [10@3, 20@2.5, 999@2] = £104 mileage total", () => {
    const p = baseProfile({
      base_price: 0,
      tiers: [
        { tier_name: "First 10", miles: 10, cost_per_mile: 3, sort_order: 1 },
        { tier_name: "Next 20", miles: 20, cost_per_mile: 2.5, sort_order: 2 },
        { tier_name: "Long haul", miles: 999, cost_per_mile: 2, sort_order: 3 },
      ],
    });
    const r = runPricingEngine(p, { distanceMiles: 42 });
    expect(r.mileagePrice).toBe(104);
    // 10*3 + 20*2.5 + 12*2 = 30 + 50 + 24 = 104
  });

  it("2) fixed route override: profile with empty tiers + base=fixed skips mileage lines", () => {
    // Simulates how computeVehicleQuote injects fixed price: base=fixed, tiers=[].
    const p = baseProfile({ base_price: 75, tiers: [] });
    const r = runPricingEngine(p, { distanceMiles: 42 });
    expect(r.mileagePrice).toBe(0);
    expect(r.breakdown.some((b) => b.kind === "mileage")).toBe(false);
    expect(r.basePrice).toBe(75);
  });

  it("3) fixed route + surcharges still add on top", () => {
    const p = baseProfile({ base_price: 75, tiers: [] });
    const r = runPricingEngine(p, {
      distanceMiles: 42,
      surcharges: [
        { label: "Pickup area: Heathrow", amount: 5 },
        { label: "Dropoff area: Gatwick", amount: 7 },
      ],
    });
    expect(r.surchargePrice).toBe(12);
    expect(r.subtotal).toBe(87);
    expect(r.finalPrice).toBe(87);
  });

  it("4a) time extra fixed within window", () => {
    const p = baseProfile({
      base_price: 20,
      time_extra_from: "22:00",
      time_extra_to: "05:00",
      time_extra_amount: 8,
      time_extra_type: "fixed",
      tiers: [{ tier_name: "flat", miles: 100, cost_per_mile: 1, sort_order: 1 }],
    });
    const r = runPricingEngine(p, { distanceMiles: 10, pickupTime: "23:30" });
    expect(r.timeExtraPrice).toBe(8);
    expect(r.finalPrice).toBe(round2(20 + 10 + 8));
  });

  it("4b) time extra percent within window", () => {
    const p = baseProfile({
      base_price: 20,
      time_extra_from: "22:00",
      time_extra_to: "05:00",
      time_extra_amount: 20, // 20 %
      time_extra_type: "percent",
      tiers: [{ tier_name: "flat", miles: 100, cost_per_mile: 1, sort_order: 1 }],
    });
    const r = runPricingEngine(p, { distanceMiles: 10, pickupTime: "23:30" });
    // 20 % of (base+mileage) = 20 % of 30 = 6
    expect(r.timeExtraPrice).toBe(6);
  });

  it("5) tax 20%: subtotal is uplifted by 20%", () => {
    const p = baseProfile({ base_price: 50, tiers: [] });
    const r = runPricingEngine(p, { distanceMiles: 0, taxRate: 0.2 });
    expect(r.subtotal).toBe(50);
    expect(r.taxPrice).toBe(10);
    expect(r.finalPrice).toBe(60);
  });

  it("6) vehicle_count multiplier applies AFTER tax", async () => {
    // Vehicle count is applied by the server wrapper (computeVehicleQuote),
    // not the raw engine. Simulate the wrapper math to lock the contract.
    const p = baseProfile({ base_price: 50, tiers: [] });
    const r = runPricingEngine(p, { distanceMiles: 0, taxRate: 0.2 });
    const vehicleCount = 2;
    const total = round2(r.finalPrice * vehicleCount);
    expect(total).toBe(120);
  });

  it("7) every line item rounds to 2 decimals", () => {
    const p = baseProfile({
      base_price: 12.3456,
      via_price: 3.3333,
      tiers: [
        { tier_name: "a", miles: 3.7777, cost_per_mile: 1.9999, sort_order: 1 },
        { tier_name: "b", miles: 5, cost_per_mile: 2.1111, sort_order: 2 },
      ],
    });
    const r = runPricingEngine(p, {
      distanceMiles: 7,
      viaStops: 2,
      surcharges: [{ label: "x", amount: 1.999 }],
      taxRate: 0.175,
    });
    for (const b of r.breakdown) {
      expect(round2((b as any).amount)).toBe((b as any).amount);
    }
    for (const key of ["basePrice", "mileagePrice", "viaPrice", "surchargePrice", "timeExtraPrice", "discountPrice", "taxPrice", "subtotal", "finalPrice"] as const) {
      expect(round2((r as any)[key])).toBe((r as any)[key]);
    }
  });

  it("engine version is exported and stable", () => {
    expect(typeof ENGINE_VERSION).toBe("string");
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
  });
});
