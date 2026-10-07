import { describe, it, expect } from "vitest";
import { PLACE_GUIDES, guideWordCount } from "@/content/place-guides";
import { evaluateQuality, countBodyWords } from "@/lib/seo/quality";

const shingles = (t: string) => {
  const w = t.toLowerCase().replace(/[^a-z0-9£ ]/g, " ").split(/\s+/).filter(Boolean);
  const s = new Set<string>();
  for (let i = 0; i + 4 <= w.length; i++) s.add(w.slice(i, i + 4).join(" "));
  return s;
};
const text = (g: (typeof PLACE_GUIDES)[number]) => g.sections.flatMap((s) => [s.heading, ...s.paragraphs]).join(" ");

describe("phase 7 place guides", () => {
  it.each(PLACE_GUIDES.map((g) => [g.path, g] as const))("%s adds 300+ words", (_p, g) => {
    expect(guideWordCount(g)).toBeGreaterThanOrEqual(300);
  });
  it("no two guides share more than 40% of their text", () => {
    for (let i = 0; i < PLACE_GUIDES.length; i++)
      for (let j = i + 1; j < PLACE_GUIDES.length; j++) {
        const a = shingles(text(PLACE_GUIDES[i])), b = shingles(text(PLACE_GUIDES[j]));
        let c = 0; for (const x of a) if (b.has(x)) c++;
        expect(c / Math.min(a.size, b.size)).toBeLessThanOrEqual(0.4);
      }
  });
  it("never types a price into guide text", () => {
    for (const g of PLACE_GUIDES) expect(text(g)).not.toMatch(/£\s?\d/);
  });
});

describe("quality word rule", () => {
  const d: any = { type: "route", name: "A", slug: "a", noindex: false, seo_tier: 1,
    meta: { from_name: "A", to_name: "B" }, lat: 1, lng: 1, keywords: ["a","b","c"],
    nearby_ids: [1,2,3], popular_route_ids: [1,2,3], related_service_ids: [1,2], region: "r", town: "t" };
  it("counts body words but not link text", () => {
    expect(countBodyWords('<p>one two <a href="/x">three four five</a> six</p>')).toBe(3);
  });
  it("keeps a new page under 300 words noindex", () => {
    expect(evaluateQuality(d, { bodyWords: 120 }).effectiveNoindex).toBe(true);
    expect(evaluateQuality(d, { bodyWords: 320 }).effectiveNoindex).toBe(false);
  });
  it("never noindexes an already-indexed page via the word rule", () => {
    expect(evaluateQuality(d, { bodyWords: 50, alreadyIndexed: true }).effectiveNoindex).toBe(false);
  });
  it("unchanged when no word count is supplied", () => {
    expect(evaluateQuality(d).effectiveNoindex).toBe(false);
  });
});
