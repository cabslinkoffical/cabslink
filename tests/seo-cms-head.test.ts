import { describe, expect, it } from "vitest";
import { applyCmsHead, recordControlsLivePage, LOCATION_HUB_CMS_HEAD_ENABLED } from "@/lib/seo/cms-head";
import { buildPublicationIssues } from "@/lib/seo/publication-checks";

const ctx = {
  redirectFrom: new Set(["/airports/abz"]),
  isBuiltInRoute: (s: string) => s === "edinburgh-to-glasgow",
  placeSlugs: new Set(["glasgow"]),
};

describe("place-page wording switch", () => {
  it("is on now the owner has approved the reviewed wording", () => {
    expect(LOCATION_HUB_CMS_HEAD_ENABLED).toBe(true);
  });

  it("swaps title and description but never the canonical", () => {
    const head = {
      meta: [{ title: "Old" }, { name: "description", content: "old d" }, { property: "og:title", content: "Old" }, { property: "og:url", content: "https://cabslink.com/areas/glasgow" }],
      links: [{ rel: "canonical", href: "https://cabslink.com/areas/glasgow" }],
    };
    const out = applyCmsHead(head, { seo_title: "New", meta_description: "new d", h1: "H" });
    expect(out.meta).toEqual([{ title: "New" }, { name: "description", content: "new d" }, { property: "og:title", content: "New" }, { property: "og:url", content: "https://cabslink.com/areas/glasgow" }]);
    expect(out.links).toBe(head.links);
    expect(applyCmsHead(head, null)).toBe(head);
  });
});

describe("controls live page", () => {
  const pub = (path: string) => ({ path, publication_status: "published" });
  it("redirected addresses do not control a page", () => {
    expect(recordControlsLivePage(pub("/airports/abz"), ctx).live).toBe(false);
  });
  it("airport records control their page", () => {
    expect(recordControlsLivePage(pub("/airports/edinburgh-airport"), ctx).live).toBe(true);
  });
  it("built-in route pages win over records", () => {
    expect(recordControlsLivePage(pub("/routes/edinburgh-to-glasgow"), ctx).live).toBe(false);
    expect(recordControlsLivePage(pub("/routes/glasgow-to-oban"), ctx).live).toBe(true);
  });
  it("place records control the page only when the switch is on and the place exists", () => {
    expect(recordControlsLivePage(pub("/areas/glasgow"), { ...ctx, cmsEnabled: false }).live).toBe(false);
    expect(recordControlsLivePage(pub("/areas/glasgow"), { ...ctx, cmsEnabled: true }).live).toBe(true);
    expect(recordControlsLivePage(pub("/areas/gleneagles"), { ...ctx, cmsEnabled: true }).live).toBe(false);
  });
  it("unpublished records never control a page", () => {
    expect(recordControlsLivePage({ path: "/airports/edinburgh-airport", publication_status: "retired" }, ctx).live).toBe(false);
  });
});

describe("publication checks", () => {
  const base = { short_intro: "x".repeat(130), featured_image_url: "a", og_image_url: "a", h1: "H1 here" };
  it("flags duplicate titles as blockers for both pages", () => {
    const issues = buildPublicationIssues([
      { id: "1", path: "/a", seo_title: "Same title for two pages here | Cabslink", meta_description: "d".repeat(100), ...base },
      { id: "2", path: "/b", seo_title: "Same title for two pages here | Cabslink", meta_description: "e".repeat(100), ...base },
    ], ["1", "1", "1", "2", "2", "2"]);
    expect(issues.filter((i) => i.issue_type === "duplicate_title").map((i) => i.page_id)).toEqual(["1", "2"]);
    expect(issues.some((i) => i.issue_type === "duplicate_meta")).toBe(false);
  });
  it("a clean record gets no issues", () => {
    expect(buildPublicationIssues([{ id: "1", path: "/a", seo_title: "A clean unique title for one page", meta_description: "d".repeat(100), ...base }], ["1", "1", "1"])).toEqual([]);
  });
  it("warns at 156 description characters but not at 155", () => {
    const record = { id: "1", path: "/a", seo_title: "A clean unique title for one page", ...base };
    expect(buildPublicationIssues([{ ...record, meta_description: "d".repeat(155) }], ["1", "1", "1"]).some(i => i.issue_type === "long_meta")).toBe(false);
    expect(buildPublicationIssues([{ ...record, meta_description: "d".repeat(156) }], ["1", "1", "1"]).some(i => i.issue_type === "long_meta")).toBe(true);
  });
});
