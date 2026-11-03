import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { tourClassPricesPence, tourStartingPricePence } from "@/lib/tours.functions";
import { MAX_TOUR_CATEGORIES } from "@/lib/tour-draft";

const rates = [
  { id: "a", name: "Executive", hourly_rate: 80, min_hours: null },
  { id: "b", name: "Saloon", hourly_rate: 50, min_hours: 8 },
];

describe("Phase 8 — tours", () => {
  it("one price: the 'from' price equals the cheapest class in the table", () => {
    const row = { duration_hours: 6, starting_price_pence_cache: 99999 };
    const table = tourClassPricesPence(row, rates);
    expect(table.map((c) => c.price_pence)).toEqual([40000, 48000]); // saloon min 8h, executive 6h
    expect(tourStartingPricePence(row, rates)).toBe(table[0].price_pence);
  });
  it("falls back to the cached price only when no class rates exist", () => {
    expect(tourStartingPricePence({ duration_hours: 6, starting_price_pence_cache: 12300 }, [])).toBe(12300);
    expect(tourStartingPricePence({ starting_price_pence_cache: null }, [])).toBeNull();
  });
  it("a fixed tour price set for a vehicle is shown instead of hourly × hours", () => {
    // 8-hour tour: Saloon fixed at £280 must show £280, not £50 × 8 = £400.
    const row = { id: "tour1", duration_hours: 8 };
    const saloon = [{ id: "s", name: "Saloon", hourly_rate: 50, min_hours: 3 }];
    const fixed = new Map([["tour1", new Map([["s", 280]])]]);
    expect(tourStartingPricePence(row, saloon)).toBe(40000);
    expect(tourStartingPricePence(row, saloon, fixed)).toBe(28000);
  });
  it("a vehicle with only a fixed tour price (no hourly rate) still gets a price", () => {
    const row = { id: "tour1", duration_hours: 8 };
    const minibus = [{ id: "m", name: "Executive Minibus", hourly_rate: null, min_hours: null }];
    const fixed = new Map([["tour1", new Map([["m", 528]])]]);
    expect(tourClassPricesPence(row, minibus, fixed)).toEqual([{ class_id: "m", name: "Executive Minibus", price_pence: 52800 }]);
    expect(tourClassPricesPence(row, minibus)).toEqual([]);
  });
  it("has at most 7 filter groups", () => {
    expect(MAX_TOUR_CATEGORIES).toBe(7);
    expect(readFileSync("src/lib/tour-admin-tools.functions.ts", "utf8")).toContain(">= MAX_TOUR_CATEGORIES");
  });
  it("Signature badge only when flagged; other tours show names", () => {
    expect(readFileSync("src/components/site/TourCard.tsx", "utf8")).toContain("tour.signature ?");
    const page = readFileSync("src/components/site/TourDetailView.tsx", "utf8");
    expect(page).toContain("{r.name}");
    expect(page).not.toContain('s.replace(/-/g, " ")');
  });
  it("/tours title only mentions where tours really start", () => {
    const idx = readFileSync("src/routes/tours.index.tsx", "utf8");
    expect(idx).not.toMatch(/Edinburgh & Glasgow \|/);
    expect(idx).not.toMatch(/from Edinburgh and Glasgow with your own driver/);
  });
});
