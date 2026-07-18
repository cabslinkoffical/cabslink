import { describe, it, expect } from "vitest";
import fs from "node:fs";

const src = fs.readFileSync("src/lib/scenic-admin.functions.ts", "utf8");

describe("publishScenicTemplate server-side guard", () => {
  it("requires admin auth via requireSupabaseAuth middleware", () => {
    const block = src.match(/export const publishScenicTemplate[\s\S]*?\}\);/)?.[0] ?? "";
    expect(block).toMatch(/requireSupabaseAuth/);
    expect(block).toMatch(/assertAdmin\(context\)/);
  });

  it("validates slug, origin/destination Place IDs, active flag, and at least one active POI", () => {
    const block = src.match(/export const publishScenicTemplate[\s\S]*?\}\);/)?.[0] ?? "";
    expect(block).toMatch(/Slug is required/);
    expect(block).toMatch(/Origin Place ID is required/);
    expect(block).toMatch(/Destination Place ID is required/);
    expect(block).toMatch(/must be active before publishing/);
    expect(block).toMatch(/active POI/i);
  });

  it("only runs validation on publish=true, unpublish is unconditional", () => {
    const block = src.match(/export const publishScenicTemplate[\s\S]*?\}\);/)?.[0] ?? "";
    expect(block).toMatch(/if \(data\.published\)/);
  });
});

describe("refreshScenicTemplateStartingPrice", () => {
  it("uses admin client for the cache write and reuses computeStartingPriceForTemplate", () => {
    const block =
      src.match(/export const refreshScenicTemplateStartingPrice[\s\S]*?\}\);/)?.[0] ?? "";
    expect(block).toMatch(/computeStartingPriceForTemplate/);
    expect(block).toMatch(/supabaseAdmin/);
    expect(block).toMatch(/assertAdmin\(context\)/);
  });
});

describe("updateScenicTemplateMeta", () => {
  it("only permits the whitelisted presentation fields", () => {
    const schema = src.match(/const templateMetaSchema = z\.object\(\{([\s\S]*?)\}\);/)?.[1] ?? "";
    const allowed = [
      "id",
      "hero_image_url",
      "short_description",
      "theme",
      "recommended_start_time",
      "long_day",
      "seasonal_note",
      "admin_notes",
    ];
    for (const key of allowed) expect(schema).toContain(key);
    // Must not accept pricing / publish / active toggles through this endpoint.
    for (const forbidden of ["published", "active", "tour_fee_pence", "origin_place_id"]) {
      expect(schema).not.toContain(forbidden);
    }
  });
});
