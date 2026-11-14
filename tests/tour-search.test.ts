import { describe, expect, it } from "vitest";
import { matchesTourLength, matchesTourSearch, tourSearchThemes } from "@/lib/tour-search";

const tour = {
  name: "Stirling Castle", short_description: "Private day trip",
  origin_label: "Edinburgh", destination_label: "Stirling",
  theme: "heritage", theme_group: "Castles & History", category_order: 2,
};

describe("tour catalogue search", () => {
  it("finds tours using their admin category, not just their legacy theme", () => {
    expect(matchesTourSearch(tour, "history")).toBe(true);
    expect(matchesTourSearch(tour, "whisky")).toBe(false);
  });
  it("normalises category punctuation and separator variants", () => {
    expect(matchesTourSearch(tour, "Castles and History", "castles_&_history")).toBe(true);
  });
  it("applies search and selected theme together", () => {
    expect(matchesTourSearch(tour, "Edinburgh", "Family Days")).toBe(false);
    expect(matchesTourSearch(tour, "Edinburgh castle", "Castles & History")).toBe(true);
  });
  it("clearing both filters restores all tours", () => {
    expect(matchesTourSearch(tour, "", "")).toBe(true);
  });
  it("uses enabled category ordering even if the first tour is unordered", () => {
    expect(tourSearchThemes([
      { ...tour, category_order: null },
      { ...tour, theme_group: "Family Days", category_order: 3 },
      tour,
      { ...tour, theme_group: "Hidden", category_order: null },
    ])).toEqual(["Castles & History", "Family Days"]);
  });
});
describe("tour length filter", () => {
  const half = { duration_hours: 5, long_day: false };
  const full = { duration_hours: 8, long_day: false };
  const longDay = { duration_hours: 12, long_day: true };
  const unknown = { duration_hours: null, long_day: false };
  it("splits regular tours at six hours", () => {
    expect(matchesTourLength(half, "half")).toBe(true);
    expect(matchesTourLength(full, "half")).toBe(false);
    expect(matchesTourLength(full, "full")).toBe(true);
    expect(matchesTourLength(half, "full")).toBe(false);
  });
  it("long-day tours only appear under the long filter", () => {
    expect(matchesTourLength(longDay, "long")).toBe(true);
    expect(matchesTourLength(longDay, "half")).toBe(false);
    expect(matchesTourLength(longDay, "full")).toBe(false);
    expect(matchesTourLength(half, "long")).toBe(false);
  });
  it("empty length shows everything and unset durations are never hidden", () => {
    expect(matchesTourLength(longDay, "")).toBe(true);
    expect(matchesTourLength(unknown, "half")).toBe(true);
    expect(matchesTourLength(unknown, "full")).toBe(true);
  });
});
