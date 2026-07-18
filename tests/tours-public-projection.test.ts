import { describe, it, expect } from "vitest";
import fs from "node:fs";

describe("tours public projection", () => {
  const src = fs.readFileSync("src/lib/tours.functions.ts", "utf8");

  it("never selects admin-only template fields", () => {
    expect(src).not.toMatch(/admin_notes/);
    expect(src).not.toMatch(/starting_price_vehicle_id/);
  });

  it("never selects admin-only POI fields (scenic_score / admin_priority / coords / address_label)", () => {
    const poiFieldsLine = src.match(/const POI_FIELDS =\s*"([^"]+)"/)?.[1] ?? "";
    for (const forbidden of ["scenic_score", "admin_priority", "latitude", "longitude", "address_label"]) {
      expect(poiFieldsLine).not.toContain(forbidden);
    }
  });

  it("PublicPoiCard exposes only whitelisted fields", () => {
    const typeBlock = src.match(/export type PublicPoiCard = \{([\s\S]*?)\};/)?.[1] ?? "";
    for (const forbidden of ["latitude", "longitude", "address_label", "scenic_score", "admin_priority"]) {
      expect(typeBlock).not.toContain(forbidden);
    }
  });

  it("uses the server publishable client (not admin) for public reads", () => {
    // getPublishedTourBySlugImpl runs against serverPublicClient; admin client only
    // appears inside the cache-refresh helper.
    const refreshBlock = src.match(/async function refreshStartingPriceCache[\s\S]*?\n\}\n/)?.[0] ?? "";
    expect(refreshBlock).toMatch(/supabaseAdmin/);
    const listImpl = src.match(/export async function listPublishedToursImpl[\s\S]*?^\}/m)?.[0] ?? "";
    expect(listImpl).not.toMatch(/supabaseAdmin/);
  });

  it("resolveTourTemplate only returns safe identifiers (no pricing fields)", () => {
    const resolvedType = src.match(/export type ResolvedTourTemplate = \{([\s\S]*?)\};/)?.[1] ?? "";
    for (const forbidden of ["price", "pence", "currency", "tax", "surcharge"]) {
      expect(resolvedType.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe("tours pricing server module", () => {
  const src = fs.readFileSync("src/lib/tours-pricing.server.ts", "utf8");

  it("reuses the authoritative pricing engine helpers", () => {
    expect(src).toMatch(/computeVehicleQuote/);
    expect(src).toMatch(/computeStopCharges/);
    expect(src).toMatch(/loadActiveProfiles/);
    expect(src).toMatch(/loadFixedPriceForRoute/);
    expect(src).toMatch(/realDistanceMiles/);
  });

  it("only sums server-side; no exported client entry point", () => {
    expect(src).not.toMatch(/createServerFn/);
  });
});
