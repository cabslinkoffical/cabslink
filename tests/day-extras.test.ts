import { describe, expect, it } from "vitest";
import { priceDayExtras } from "@/lib/day-extras";
import type { ExtrasCatalogue } from "@/lib/extras-pricing";

const catalogue: ExtrasCatalogue = [
  { key: "seat", name: "Toddler seat", category: "child_seat", active: true, applies_to_all_classes: true, price_pence: 1000, max_quantity: 3, class_prices: { saloon: 1500 }, class_max: { saloon: 2 } },
  { key: "meet_greet", name: "Meet & greet", category: "meet_greet", active: true, applies_to_all_classes: true, price_pence: 1000, price_basis: "per_booking", max_quantity: 1, class_prices: {} },
];
describe("tour extras", () => {
  it("uses real per-class seat prices plus one paid meet and greet", () => {
    const result = priceDayExtras(catalogue, [{ key: "seat", quantity: 2 }, { key: "meet_greet", quantity: 1 }], "saloon", 2);
    expect(result.lines.map((e) => e.amount)).toEqual([30, 10]);
    expect(result.seatCount).toBe(2);
  });
  it("limits child seats to one per passenger", () => {
    expect(() => priceDayExtras(catalogue, [{ key: "seat", quantity: 2 }], "saloon", 1)).toThrow(/more child seats than passengers/);
  });
  it("enforces the class-specific maximum", () => {
    expect(() => priceDayExtras(catalogue, [{ key: "seat", quantity: 3 }], "saloon", 3)).toThrow(/limit/);
  });
  it("rejects duplicate selections and unavailable extras", () => {
    expect(() => priceDayExtras(catalogue, [{ key: "seat", quantity: 1 }, { key: "seat", quantity: 1 }], "saloon", 2)).toThrow(/once/);
    expect(() => priceDayExtras(catalogue, [{ key: "missing", quantity: 1 }], "saloon", 2)).toThrow(/available/);
  });
  it("uses the transfer tax rule for extra charges", () => {
    expect(priceDayExtras(catalogue, [{ key: "meet_greet", quantity: 1 }], "saloon", 1, 0.2, "exclusive").lines[0]?.amount).toBe(12);
  });
});