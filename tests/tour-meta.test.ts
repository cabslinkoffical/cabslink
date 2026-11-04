import { describe, expect, it } from "vitest";
import { tourMetaDescription, tourMetaTitle, tourSeoChecks } from "@/lib/seo/tour-meta";

describe("tour Google title and SEO checklist", () => {
  it("keeps the fixed Harry Potter title", () => {
    expect(tourMetaTitle({ slug: "harry-potter-highland-scenic", name: "x" }).length).toBeLessThanOrEqual(60);
  });

  it("builds a title of 60 characters or fewer from a long name", () => {
    const title = tourMetaTitle({ slug: "no-such-tour", name: "A very long tour name that goes on and on past every limit Google has" });
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith("| Cabslink")).toBe(true);
  });

  it("uses the staff-written description when present", () => {
    expect(tourMetaDescription({ slug: "no-such-tour", name: "T", meta_description: "Own text" })).toBe("Own text");
  });

  it("fails the description check when only the automatic one exists", () => {
    const { checks } = tourSeoChecks({ slug: "no-such-tour", name: "T", short_description: "Short." }, 2);
    expect(checks.find((c) => c.id === "desc")?.ok).toBe(false);
  });

  it("scores a tour with no stops, photo or content below 50%", () => {
    expect(tourSeoChecks({ slug: "no-such-tour", name: "T" }, 0).score).toBeLessThan(50);
  });
});
