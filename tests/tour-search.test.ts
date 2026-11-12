import { describe, expect, it } from "vitest";
import { matchesTourSearch, tourSearchThemes } from "@/lib/tour-search";

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