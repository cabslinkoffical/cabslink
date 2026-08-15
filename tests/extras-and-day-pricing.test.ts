import { describe, it, expect } from "vitest";
import { resolveExtra, extraPence, type ExtrasCatalogue } from "@/lib/extras-pricing";
import { computeHourlyBase } from "@/lib/hourly-base";
import { bothWays } from "@/lib/pricing-rules";

const CLASS_A = "11111111-1111-4111-8111-111111111111";
const CLASS_B = "22222222-2222-4222-8222-222222222222";

describe("canonical extras resolution", () => {
  it("falls back to legacy site settings when no active canonical extra exists", () => {
    const r = resolveExtra([], "child_seat", CLASS_A, 1200);
    expect(r).toEqual({ pence: 1200, available: true, source: "legacy" });
  });

  it("prefers the canonical extra over the legacy fee", () => {
    const cat: ExtrasCatalogue = [
      { key: "child_seat", active: true, price_pence: 900, applies_to_all_classes: true, class_prices: {} },
    ];
    expect(extraPence(cat, "child_seat", CLASS_A, 1200)).toBe(900);
  });

  it("applies a class-specific price override", () => {
    const cat: ExtrasCatalogue = [
      {
        key: "child_seat",
        active: true,
        price_pence: 900,
        applies_to_all_classes: true,
        class_prices: { [CLASS_B]: 1500 },
      },
    ];
    expect(extraPence(cat, "child_seat", CLASS_A, 1200)).toBe(900);
    expect(extraPence(cat, "child_seat", CLASS_B, 1200)).toBe(1500);
  });

  it("is not bookable for classes outside an explicit class list", () => {
    const cat: ExtrasCatalogue = [
      {
        key: "meet_greet",
        active: true,
        price_pence: 1000,
        applies_to_all_classes: false,
        class_prices: { [CLASS_B]: null },
      },
    ];
    expect(resolveExtra(cat, "meet_greet", CLASS_A, 700)).toEqual({ pence: 0, available: false, source: "canonical" });
    expect(extraPence(cat, "meet_greet", CLASS_B, 700)).toBe(1000);
  });

  it("ignores inactive canonical extras and uses the legacy fee", () => {
    const cat: ExtrasCatalogue = [
      { key: "child_seat", active: false, price_pence: 900, applies_to_all_classes: true, class_prices: {} },
    ];
    expect(extraPence(cat, "child_seat", CLASS_A, 1200)).toBe(1200);
  });
});

describe("hourly / day-hire base", () => {
  it("prices purely by the hour when no day rate is configured", () => {
    const r = computeHourlyBase({ perHour: 50, chargedHours: 6 });
    expect(r).toEqual({ total: 300, days: 0, hours: 6, basis: "hourly" });
  });

  it("keeps hourly pricing below the day threshold", () => {
    const r = computeHourlyBase({ perHour: 50, chargedHours: 5, dailyPrice: 350, includedHoursPerDay: 8 });
    expect(r.basis).toBe("hourly");
    expect(r.total).toBe(250);
  });

  it("uses the day rate when it beats the hourly total", () => {
    const r = computeHourlyBase({ perHour: 50, chargedHours: 8, dailyPrice: 350, includedHoursPerDay: 8 });
    expect(r).toEqual({ total: 350, days: 1, hours: 0, basis: "daily" });
  });

  it("bills whole days plus remaining hours", () => {
    const r = computeHourlyBase({ perHour: 50, chargedHours: 10, dailyPrice: 350, includedHoursPerDay: 8 });
    expect(r).toEqual({ total: 450, days: 1, hours: 2, basis: "daily" });
  });

  it("never charges more than the hourly total", () => {
    const r = computeHourlyBase({ perHour: 40, chargedHours: 8, dailyPrice: 500, includedHoursPerDay: 8 });
    expect(r.total).toBe(320);
    expect(r.basis).toBe("hourly");
  });
});

describe("legacy bidirectional / valid_for_return semantics", () => {
  it("treats a legacy row with only valid_for_return=true as both-ways", () => {
    expect(bothWays({ bidirectional: null, valid_for_return: true })).toBe(true);
  });

  it("does not silently flip a legacy mismatch row to one-way", () => {
    // Post-migration these rows carry bidirectional=true; the reader must agree.
    expect(bothWays({ bidirectional: true, valid_for_return: true })).toBe(true);
  });

  it("keeps genuinely one-way rules one-way", () => {
    expect(bothWays({ bidirectional: false, valid_for_return: false })).toBe(false);
    expect(bothWays({ bidirectional: null, valid_for_return: null })).toBe(false);
  });

  it("prefers the canonical field when both are present", () => {
    expect(bothWays({ bidirectional: true, valid_for_return: false })).toBe(true);
  });
});

describe("admin extras override changes the customer quote", () => {
  const legacyChildSeat = 1500;
  it("an active admin extra with a class override sets the charged amount, not site settings", () => {
    const cat: ExtrasCatalogue = [
      {
        key: "child_seat",
        active: true,
        price_pence: 800,
        applies_to_all_classes: true,
        class_prices: { [CLASS_B]: 2500 },
      },
    ];
    const quoteWithLegacyOnly = extraPence([], "child_seat", CLASS_B, legacyChildSeat);
    const quoteWithAdminExtra = extraPence(cat, "child_seat", CLASS_B, legacyChildSeat);
    expect(quoteWithLegacyOnly).toBe(1500);
    expect(quoteWithAdminExtra).toBe(2500);
    expect(quoteWithAdminExtra).not.toBe(quoteWithLegacyOnly);
  });
});
