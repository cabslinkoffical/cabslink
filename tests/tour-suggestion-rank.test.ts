import { describe, it, expect } from "vitest";
import { rankSuggestions, fitsHours } from "@/lib/tour-suggestion-rank";
const p = (o: Partial<any>) => ({ roundTripMiles: 20, recommendedMinutes: 30, category: "Restaurant", featured: false, reviewCount: 0, ...o });
describe("hourly suggestions", () => {
  it("a place too far to drive and visit inside 4 hours does not fit", () => {
    // 120 miles at 34 mph ≈ 212 min + 60 min visit > 240 min
    expect(fitsHours(p({ roundTripMiles: 120, recommendedMinutes: 60 }), 200, 4, 34)).toBe(false);
    expect(fitsHours(p({ roundTripMiles: 120, recommendedMinutes: 60 }), 200, 8, 34)).toBe(true);
  });
  it("places that fit come first, scenic before others", () => {
    const far = p({ name: "far", roundTripMiles: 300, category: "Viewpoint" });
    const cafe = p({ name: "cafe", reviewCount: 9000 });
    const loch = p({ name: "loch", category: "Loch", reviewCount: 10 });
    const out = rankSuggestions([far, cafe, loch], 100, 4, 34).map((x: any) => x.name);
    expect(out).toEqual(["loch", "cafe", "far"]);
  });
});
