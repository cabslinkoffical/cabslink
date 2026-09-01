import { describe, it, expect } from "vitest";
import { TOUR_SEO, DRAFT_TOURS, DRAFT_TOUR_SLUGS, draftTour, tourSeo } from "@/lib/seo/tour-seo";
import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";

describe("tour SEO overrides", () => {
  it("covers all 22 published tours", () => {
    expect(Object.keys(TOUR_SEO)).toHaveLength(22);
  });

  it.each(Object.entries(TOUR_SEO))("%s has a renderable title and description", (_slug, seo) => {
    expect(seo.metaTitle.length).toBeLessThanOrEqual(60);
    expect(seo.h1.length).toBeGreaterThan(10);
    expect(seo.metaDescription.length).toBeGreaterThanOrEqual(110);
    expect(seo.metaDescription.length).toBeLessThanOrEqual(160);
  });

  it("never repeats the old boilerplate tail", () => {
    for (const seo of Object.values(TOUR_SEO)) {
      expect(seo.metaDescription).not.toMatch(/from Edinburgh to Edinburgh/i);
    }
  });

  it("quotes no tour prices anywhere (owner has not supplied figures)", () => {
    const blob = [
      ...Object.values(TOUR_SEO).flatMap((s) => [s.h1, s.metaTitle, s.metaDescription]),
      ...DRAFT_TOURS.flatMap((t) => [
        t.metaTitle,
        t.metaDescription,
        ...t.intro,
        ...t.facts.map((f) => `${f.label} ${f.value}`),
        ...t.sections.flatMap((s) => [...s.body, ...(s.bullets ?? [])]),
        ...t.faqs.flatMap((f) => [f.q, f.a]),
      ]),
    ].join(" ");
    expect(blob).not.toMatch(/£\s?\d/);
  });
});

describe("draft tour pages", () => {
  it("are marked for review and resolvable by slug", () => {
    for (const slug of DRAFT_TOUR_SLUGS) {
      expect(draftTour(slug)?.review).toBe(true);
      // Drafts are code-defined, so they must not also carry a CMS override.
      expect(tourSeo(slug)).toBeUndefined();
    }
  });

  it("stay out of the sitemap", () => {
    for (const slug of DRAFT_TOUR_SLUGS) {
      expect(PUBLIC_ROUTES).not.toContain(`/tours/${slug}`);
    }
  });

  it("link out to the twelve distillery pages from the whisky tour", () => {
    const whisky = draftTour("whisky-distillery-tours-from-edinburgh")!;
    const links = whisky.sections.flatMap((s) => s.links ?? []).filter((l) => l.to.startsWith("/distilleries/"));
    expect(links).toHaveLength(12);
  });

  it("links Skye and Loch Ness to their attraction pages", () => {
    expect(draftTour("isle-of-skye-from-edinburgh")!.related.map((r) => r.to)).toContain(
      "/attractions/isle-of-skye",
    );
    expect(draftTour("loch-ness-from-edinburgh")!.related.map((r) => r.to)).toContain("/attractions/loch-ness");
  });
});
