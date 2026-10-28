import { describe, it, expect } from "vitest";
import { resolveExtra, extraPence, type ExtrasCatalogue } from "@/lib/extras-pricing";
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

describe("per-class extra limits", () => {
  const cat: ExtrasCatalogue = [
    {
      key: "toddler_seat", active: true, price_pence: 1000, applies_to_all_classes: true,
      category: "child_seat", max_quantity: 3,
      class_prices: { [CLASS_B]: 1500 }, class_max: { [CLASS_B]: 1 },
    },
    {
      key: "waiting_time", active: true, price_pence: 50, applies_to_all_classes: true,
      price_basis: "per_minute", max_quantity: 120, class_prices: {}, class_max: { [CLASS_B]: 0 },
    },
  ];
  it("uses the default limit, or the class override", () => {
    expect(resolveExtra(cat, "toddler_seat", CLASS_A, 0)).toMatchObject({ pence: 1000, maxQuantity: 3 });
    expect(resolveExtra(cat, "toddler_seat", CLASS_B, 0)).toMatchObject({ pence: 1500, maxQuantity: 1 });
  });
  it("a class limit of 0 hides the extra for that class", () => {
    expect(resolveExtra(cat, "waiting_time", CLASS_B, 0).available).toBe(false);
    expect(resolveExtra(cat, "waiting_time", CLASS_A, 0)).toMatchObject({ available: true, maxQuantity: 120 });
  });
});
