import { describe, it, expect } from "vitest";
import { loadFixedPriceForRoute } from "@/lib/pricing-helpers.server";

function mockClient(rows: any[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            not: () => Promise.resolve({ data: rows }),
          }),
        }),
      }),
    }),
  } as any;
}

const A = "ChIJA_place";
const B = "ChIJB_place";
const C = "ChIJC_place";

describe("loadFixedPriceForRoute — exact Place-ID matching only", () => {
  it("returns exact from->to match", async () => {
    const client = mockClient([
      { vehicle_id: null, price: 55, from_place_id: A, to_place_id: B, bidirectional: false },
      { vehicle_id: null, price: 99, from_place_id: A, to_place_id: C, bidirectional: false },
    ]);
    const out = await loadFixedPriceForRoute(client, A, B);
    expect(out).toEqual([{ vehicle_id: null, price: 55 }]);
  });

  it("ignores reverse match when bidirectional=false", async () => {
    const client = mockClient([
      { vehicle_id: null, price: 55, from_place_id: A, to_place_id: B, bidirectional: false },
    ]);
    const out = await loadFixedPriceForRoute(client, B, A);
    expect(out).toEqual([]);
  });

  it("returns reverse match when bidirectional=true", async () => {
    const client = mockClient([
      { vehicle_id: null, price: 55, from_place_id: A, to_place_id: B, bidirectional: true },
    ]);
    const out = await loadFixedPriceForRoute(client, B, A);
    expect(out).toEqual([{ vehicle_id: null, price: 55 }]);
  });

  it("does NOT match when only labels look similar (label injection)", async () => {
    // Adversary passes a spoofed label; matching is by exact Place-ID pair.
    const client = mockClient([
      { vehicle_id: null, price: 20, from_place_id: A, to_place_id: B, bidirectional: false },
    ]);
    const out = await loadFixedPriceForRoute(client, "ChIJEvil_place", B);
    expect(out).toEqual([]);
  });
});
