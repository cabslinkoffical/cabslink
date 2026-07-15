import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";

const selectMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => selectMock(),
        }),
      }),
    }),
  }),
}));

async function importFn() {
  vi.resetModules();
  process.env.SUPABASE_URL = "http://localhost";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  const mod = await import("@/lib/fleet.functions");
  return mod.listPublicVehiclesImpl;
}

describe("listPublicVehicles", () => {
  beforeEach(() => selectMock.mockReset());

  it("returns only public-safe fields, sorted, non-empty images only", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { id: "1", name: "S-Class", category: "Luxury", image_url: "/s.png",
          passengers: 3, luggage: 2, hand_luggage: 2, description: "d", featured: true, display_order: 1 },
        { id: "2", name: "Empty", category: "X", image_url: "", passengers: 1, luggage: 0, hand_luggage: 0, description: "", featured: false, display_order: 2 },
        { id: "3", name: "V-Class", category: "MPV", image_url: "/v.png",
          passengers: 6, luggage: 4, hand_luggage: 6, description: "e", featured: false, display_order: 3 },
      ],
      error: null,
    });
    const fn = await importFn();
    const list = await fn();
    expect(list).toHaveLength(2);
    // Order preserved from DB (already ordered by display_order asc)
    expect(list.map((v: any) => v.name)).toEqual(["S-Class", "V-Class"]);
    for (const v of list) {
      const keys = Object.keys(v).sort();
      expect(keys).toEqual([
        "category", "description", "display_order", "featured", "hand_luggage",
        "id", "image_url", "luggage", "name", "passengers",
      ]);
      // Sensitive/internal fields never leak
      expect(v).not.toHaveProperty("cost");
      expect(v).not.toHaveProperty("base_fare");
      expect(v).not.toHaveProperty("per_mile_rate");
      expect(v).not.toHaveProperty("internal_notes");
    }
  });

  it("DB error resolves to empty array (public empty state)", async () => {
    selectMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const fn = await importFn();
    const list = await fn();
    expect(list).toEqual([]);
  });

  it("empty result set returns empty array", async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null });
    const fn = await importFn();
    expect(await fn()).toEqual([]);
  });
});

describe("fleet source guards", () => {
  it("listPublicVehicles filters to active=true", () => {
    const src = fs.readFileSync("src/lib/fleet.functions.ts", "utf8");
    expect(src).toMatch(/\.eq\("active",\s*true\)/);
  });
  it("listPublicVehicles orders by display_order ascending", () => {
    const src = fs.readFileSync("src/lib/fleet.functions.ts", "utf8");
    expect(src).toMatch(/order\("display_order",\s*\{\s*ascending:\s*true\s*\}\)/);
  });
});
