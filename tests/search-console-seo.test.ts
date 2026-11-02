import { describe, expect, it } from "vitest";
import { categoryIsIndexable } from "@/lib/blog-category-seo";
import { buildRegionContent, indexableRegionPaths, type RegionPlace } from "@/lib/seo/region-content";
import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";
import { getGuide } from "@/lib/seo/guides";
import { tourExtras } from "@/content/tour-extras";

describe("blog category indexing", () => {
  it("indexes categories with 3 or more posts only", () => {
    expect(categoryIsIndexable(2)).toBe(false);
    expect(categoryIsIndexable(3)).toBe(true);
    expect(categoryIsIndexable(0)).toBe(false);
  });
});

const place = (name: string, type: string, lat: number, lng: number): RegionPlace => ({
  type, slug: name.toLowerCase().replace(/\s+/g, "-"), name, display_name: null, lat, lng,
  href: `/areas/${name.toLowerCase().replace(/\s+/g, "-")}`,
});

const MANY = Array.from({ length: 20 }, (_, i) => place(`Town ${i + 1}`, "town", 56 + i * 0.05, -3.5));

describe("region page indexing", () => {
  it("indexes a Scottish region with enough real content", () => {
    const c = buildRegionContent("Scotland", MANY);
    expect(c.uniqueWords).toBeGreaterThanOrEqual(300);
    expect(c.indexable).toBe(true);
    expect(c.faqs.length).toBeGreaterThan(0);
  });

  it("keeps a thin region with one place noindex", () => {
    expect(buildRegionContent("Argyll", [place("Oban", "town", 56.41, -5.47)]).indexable).toBe(false);
  });

  it("keeps England and Wales noindex whatever their content", () => {
    expect(buildRegionContent("England", MANY).indexable).toBe(false);
    expect(buildRegionContent("Wales", MANY).indexable).toBe(false);
  });

  it("sitemap helper lists only indexable regions", () => {
    const rows = [
      ...MANY.map((p) => ({ ...p, region: "Scotland", seo_tier: 1 })),
      ...MANY.map((p) => ({ ...p, region: "England", seo_tier: 1 })),
      { ...place("Oban", "town", 56.41, -5.47), region: "Argyll", seo_tier: 1 },
    ];
    expect(indexableRegionPaths(rows, (p) => `/areas/${p.slug}`)).toEqual(["/areas/region/scotland"]);
  });
});

describe("route pages signed off for indexing", () => {
  it.each([
    "dundee-to-edinburgh-airport",
    "aberdeen-to-edinburgh-airport",
    "perth-to-edinburgh-airport",
    "glasgow-airport-to-edinburgh",
  ])("lists /routes/%s in the sitemap", (slug) => {
    expect(PUBLIC_ROUTES).toContain(`/routes/${slug}`);
  });
});

describe("day trips guide", () => {
  it("links the Harry Potter tour with the agreed anchor text", () => {
    const g = getGuide("day-trips-from-edinburgh")!;
    const links = (g.sections ?? []).flatMap((s) => s.links ?? []);
    expect(links).toContainEqual(expect.objectContaining({
      label: "Harry Potter tour from Edinburgh",
      to: "/tours/harry-potter-highland-expedition",
    }));
  });

  it("adds the four private day trip FAQs", () => {
    const qs = getGuide("day-trips-from-edinburgh")!.faqs.map((f) => f.q);
    expect(qs).toEqual(expect.arrayContaining([
      "Are your day trips from Edinburgh private?",
      "Can you collect us from our hotel in Edinburgh?",
      "Can we change the stops on the day?",
      "How far ahead should I book a private day trip?",
    ]));
  });
});

describe("Harry Potter tour extras", () => {
  it("has the six owner FAQs with the tour's hours filled in", () => {
    const x = tourExtras("harry-potter-highland-expedition", 10)!;
    expect(x.faqs.map((f) => f.q)).toEqual([
      "How long is the Harry Potter tour from Edinburgh?",
      "Will we see the Hogwarts Express?",
      "Is it a private tour?",
      "How many people can come?",
      "Can you pick us up from our hotel?",
      "Can we do it as a multi-day trip?",
    ]);
    expect(x.faqs[0].a).toContain("10-hour");
  });

  it("never claims an official or licensed connection", () => {
    const x = tourExtras("harry-potter-highland-expedition", 10)!;
    const text = JSON.stringify(x);
    expect(text).not.toMatch(/\b(official|licensed|endorsed|authorised|authorized)\b/i);
  });
});
