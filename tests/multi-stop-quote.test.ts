import { describe, it, expect, vi, beforeEach } from "vitest";

// TanStack server-fn infra
vi.mock("@tanstack/react-start", () => {
  const chain = (state: any = {}) => ({
    middleware: () => chain(state),
    inputValidator: (v: any) => chain({ ...state, validator: v }),
    handler: (h: any) => async (args: any) => {
      const data = state.validator ? state.validator(args?.data) : args?.data;
      return h({ data, context: {} });
    },
  });
  return { createServerFn: () => chain(), useServerFn: (fn: any) => fn };
});
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => "9.9.9.9",
  setResponseStatus: () => {},
}));

// Pricing helpers — deterministic
const PROFILE = {
  id: "p1",
  vehicle_id: "veh-1",
  base_price: 10,
  via_price: 0,
  vehicle_add_price_enabled: false,
  time_extra_from: null,
  time_extra_to: null,
  time_extra_amount: 0,
  time_extra_type: "fixed",
  status: true,
  tiers: [{ tier_name: "flat", miles: 9999, cost_per_mile: 1, sort_order: 1 }],
  vehicle: { id: "veh-1", name: "Executive", category: "car", image_url: "", passengers: 4, luggage: 4, hand_luggage: 4 },
};
vi.mock("@/lib/pricing-helpers.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pricing-helpers.server")>(
    "@/lib/pricing-helpers.server",
  );
  return {
    ...actual,
    publicClient: () => ({}),
    realDistanceMiles: vi.fn(async (_p: string, _d: string, wp: string[] = []) =>
      wp.length === 0 ? { miles: 100, minutes: 120 } : { miles: 110, minutes: 140 },
    ),
    loadActiveProfiles: async () => [PROFILE],
    loadAreaSurcharges: async () => [],
    loadFixedPriceForRoute: async () => [],
    loadQuoteSettings: async () => ({ taxEnabled: false, taxRate: 0, taxLabel: "VAT", currency: "GBP", currencySymbol: "£" }),
  };
});

// Rate-limit passthrough
vi.mock("@/lib/rate-limit.server", () => ({ checkLimit: () => ({ ok: true }) }));

// Template lookup + POI fees — parametrised via `store`
const store: { template: any; pois: any[] } = { template: null, pois: [] };
vi.mock("@/lib/pois.functions", () => ({
  findMatchingTemplate: async () => store.template,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (t: string) => ({
      select: () => ({
        in: () => Promise.resolve({ data: t === "points_of_interest" ? store.pois : [] }),
        eq: () => ({ maybeSingle: async () => ({ data: { sightseeing_threshold_minutes: 30, tour_threshold_minutes: 120, tour_threshold_stops: 3, included_stop_minutes: 15, price_per_extra_15min_pence: 500, max_selected_stops: 8 } }) }),
      }),
    }),
  }),
}));

import { calculateMultiStopQuote } from "@/lib/scenic-quote.functions";

const base = {
  pickup_place_id: "ChIJ_pickup",
  pickup_label: "Edinburgh",
  destination_place_id: "ChIJ_dest",
  destination_label: "Fort William",
  pickup_time: "10:00",
  route_mode: "scenic" as const,
  stops: [],
};

beforeEach(() => {
  store.template = null;
  store.pois = [];
});

describe("calculateMultiStopQuote", () => {
  it("no stops → direct_transfer, driving-only totals, zero detour", async () => {
    const q = await calculateMultiStopQuote({ data: base });
    expect(q.service_type).toBe("direct_transfer");
    expect(q.planned_stop_duration_seconds).toBe(0);
    expect(q.direct_distance_miles).toBe(100);
    expect(q.with_stops_distance_miles).toBe(100);
    expect(q.detour_miles).toBe(0);
    expect(q.vehicles[0].final_total).toBe(110); // 10 base + 100 mi × £1
  });

  it("one 45-min attraction stop → sightseeing_transfer with stop fee, planned time, detour", async () => {
    store.pois = [
      { place_id: "ChIJ_castle", stop_fee_pence: 500, parking_fee_pence: 250, category: "attraction", active: true },
    ];
    const q = await calculateMultiStopQuote({
      data: { ...base, stops: [{ place_id: "ChIJ_castle", label: "Stirling Castle", minutes: 45 }] },
    });
    expect(q.service_type).toBe("sightseeing_transfer");
    expect(q.planned_stop_duration_seconds).toBe(45 * 60);
    expect(q.detour_miles).toBe(10); // 110 - 100
    expect(q.stops_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    // engine 10 + 110mi + stop_fee 5 + parking 2.5 + stop_time 10 (30 overrun / 15 * £5) = 137.50
    expect(q.vehicles[0].final_total).toBe(137.5);
    const kinds = q.vehicles[0].breakdown.map((b) => b.kind);
    expect(kinds).toEqual(expect.arrayContaining(["stop_fee", "stop_time", "parking"]));
  });

  it("3+ attraction stops → private_tour", async () => {
    store.pois = ["a", "b", "c"].map((k) => ({ place_id: `ChIJ_${k}`, stop_fee_pence: 0, parking_fee_pence: 0, category: "attraction", active: true }));
    const q = await calculateMultiStopQuote({
      data: {
        ...base,
        stops: [
          { place_id: "ChIJ_a", label: "A", minutes: 20 },
          { place_id: "ChIJ_b", label: "B", minutes: 20 },
          { place_id: "ChIJ_c", label: "C", minutes: 20 },
        ],
      },
    });
    expect(q.service_type).toBe("private_tour");
    expect(q.attraction_stops).toBe(3);
  });

  it("template match adds scenic/tour fee for sightseeing service", async () => {
    store.template = { id: "tpl-1", slug: "edi-fw", tour_fee_pence: 2500 };
    store.pois = [{ place_id: "ChIJ_castle", stop_fee_pence: 0, parking_fee_pence: 0, category: "attraction", active: true }];
    const q = await calculateMultiStopQuote({
      data: { ...base, stops: [{ place_id: "ChIJ_castle", label: "Castle", minutes: 60 }] },
    });
    expect(q.template_id).toBe("tpl-1");
    expect(q.vehicles[0].breakdown.some((b) => b.kind === "scenic_fee" && b.amount === 25)).toBe(true);
  });

  it("rejects consecutive duplicate stops", async () => {
    await expect(
      calculateMultiStopQuote({
        data: {
          ...base,
          stops: [
            { place_id: "ChIJ_x", label: "X", minutes: 20 },
            { place_id: "ChIJ_x", label: "X", minutes: 20 },
          ],
        },
      }),
    ).rejects.toThrow(/twice in a row/i);
  });

  it("fingerprint changes when a stop's duration changes", async () => {
    store.pois = [{ place_id: "ChIJ_castle", stop_fee_pence: 0, parking_fee_pence: 0, category: "attraction", active: true }];
    const a = await calculateMultiStopQuote({ data: { ...base, stops: [{ place_id: "ChIJ_castle", label: "Castle", minutes: 30 }] } });
    const b = await calculateMultiStopQuote({ data: { ...base, stops: [{ place_id: "ChIJ_castle", label: "Castle", minutes: 45 }] } });
    expect(a.stops_fingerprint).not.toBe(b.stops_fingerprint);
  });
});
