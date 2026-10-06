import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { tourClassPricesPence, tourStartingPricePence } from "@/lib/tours.functions";
import { THEME_GROUPS } from "@/lib/scenic-admin.functions";

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
  it("has at most 7 filter groups", () => {
    expect(THEME_GROUPS.length).toBeLessThanOrEqual(7);
  });
  it("Signature badge only when flagged; other tours show names", () => {
    expect(readFileSync("src/components/site/TourCard.tsx", "utf8")).toContain("tour.signature ?");
    const page = readFileSync("src/routes/tours.$slug.tsx", "utf8");
    expect(page).toContain("{r.name}");
    expect(page).not.toContain('s.replace(/-/g, " ")');
  });
  it("/tours title only mentions where tours really start", () => {
    const idx = readFileSync("src/routes/tours.index.tsx", "utf8");
    expect(idx).not.toMatch(/Edinburgh & Glasgow \|/);
    expect(idx).not.toMatch(/from Edinburgh and Glasgow with your own driver/);
  });
});
