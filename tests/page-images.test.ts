import { describe, expect, it } from "vitest";
import { PAGE_IMAGES, pageImageFor } from "@/content/page-images";

const entries = Object.entries(PAGE_IMAGES);

describe("page photo registry", () => {
  it("gives every page its own photo (no two pages share one)", () => {
    const srcs = entries.map(([, i]) => i.src);
    const files = entries.map(([, i]) => i.file);
    expect(new Set(srcs).size).toBe(srcs.length);
    expect(new Set(files).size).toBe(files.length);
  });

  it("serves every photo from the site's own image storage, never a stock link", () => {
    for (const [, i] of entries) {
      expect(i.src.startsWith("/__l5e/assets-v1/")).toBe(true);
      expect(i.src).not.toMatch(/unsplash|pexels|pixabay/i);
    }
  });

  it("credits every photo with a free licence and source page", () => {
    for (const [, i] of entries) {
      expect(i.alt.trim().length).toBeGreaterThan(5);
      expect(i.author.trim()).not.toBe("");
      expect(i.license).toMatch(/CC|Public domain|PD|^Attribution$/i);
      expect(i.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });

  it("covers every airport, area, route and destination page", () => {
    for (const p of [
      "/airports/edinburgh-airport",
      "/areas/fort-william",
      "/routes/edinburgh-to-glasgow",
      "/distilleries/the-macallan",
      "/hospitals/royal-infirmary-edinburgh",
      "/stations/haymarket",
    ]) {
      expect(pageImageFor(p)).not.toBeNull();
    }
    expect(pageImageFor("/areas/fort-william/")?.src).toBe(PAGE_IMAGES["/areas/fort-william"].src);
  });
});
