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
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const PROFILE = {
  vehicle: { id: "22222222-2222-2222-2222-222222222222", name: "Executive", category: "car", image_url: "", passengers: 4, luggage: 4, hand_luggage: 4 },
  base_price: 10, via_price: 0, vehicle_add_price_enabled: false,
  time_extra_from: null, time_extra_to: null, time_extra_amount: 0, time_extra_type: "fixed",
  status: true, tiers: [{ tier_name: "flat", miles: 9999, cost_per_mile: 1, sort_order: 1 }],
};
vi.mock("@/lib/pricing-helpers.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pricing-helpers.server")>(
    "@/lib/pricing-helpers.server",
  );
  return {
    ...actual,
    publicClient: () => ({}),
    assertAdmin: async () => {},
    realDistanceMiles: vi.fn(async () => ({ miles: 20, minutes: 30 })),
    loadActiveProfiles: async () => [PROFILE],
    loadAreaSurcharges: async () => [],
    loadFixedPriceForRoute: async () => [],
    loadQuoteSettings: async () => ({ taxEnabled: false, taxRate: 0, taxLabel: "VAT", currency: "GBP", currencySymbol: "£" }),
  };
});

vi.mock("@/lib/notifications.server", () => ({
  notifyBookingReceived: vi.fn(async () => {}),
  notifyAdminNewBooking: vi.fn(async () => {}),
}));

// Scenic helpers — deterministic thresholds, no POI fees, multi-stop total = £123.
vi.mock("@/lib/scenic-quote.functions", () => ({
  loadPoiFeesByPlaceId: async () => new Map(),
  loadThresholds: async () => ({
    sightseeingThresholdMinutes: 30,
    tourThresholdMinutes: 120,
    tourThresholdStops: 3,
    includedStopMinutes: 15,
    pricePerExtra15MinPence: 500,
    maxSelectedStops: 8,
  }),
  calculateMultiStopQuote: async () => ({
    template_id: null,
    vehicles: [{ vehicle_id: "22222222-2222-2222-2222-222222222222", per_vehicle_total: 123 }],
  }),
}));

const store = { inserts: [] as any[], refCounter: 0 };
vi.mock("@/integrations/supabase/client.server", () => {
  const from = () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    insert: (payload: any) => {
      store.inserts.push(payload);
      return {
        select: () => ({
          single: async () => ({
            data: { id: `booking-${store.inserts.length}`, price: payload.price, booking_ref: payload.booking_ref },
            error: null,
          }),
        }),
      };
    },
  });
  const rpc = async () => {
    store.refCounter += 1;
    return { data: `CL-260710-T${store.refCounter}`, error: null };
  };
  return { supabaseAdmin: { from, rpc } };
});

import { createBooking } from "@/lib/pricing.functions";
import { stopsFingerprint } from "@/lib/stops-fingerprint";
import { _resetAllLimits } from "@/lib/rate-limit.server";

const basePayload = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  vehicleId: "22222222-2222-2222-2222-222222222222",
  vehicleCount: 1,
  pickupPlaceId: "ChIJ_pickup",
  pickupLabel: "Edinburgh",
  destinationPlaceId: "ChIJ_dest",
  destinationLabel: "Fort William",
  stops: [
    { placeId: "ChIJ_stop1", label: "Glencoe", minutes: 200, category: "attraction" },
  ],
  routeMode: "scenic" as const,
  pickupDate: "2026-08-01",
  pickupTime: "10:00",
  passengers: 2,
  luggage: 1,
  customer_name: "Alice",
  email: "alice@example.com",
  phone: "07700900123",
  child_seat: false,
  meet_greet: false,
  return_journey: false,
};

async function goodFingerprint() {
  return stopsFingerprint({
    pickupPlaceId: basePayload.pickupPlaceId,
    destinationPlaceId: basePayload.destinationPlaceId,
    routeMode: "scenic",
    stops: [{ place_id: "ChIJ_stop1", minutes: 200 }],
  });
}

beforeEach(() => {
  store.inserts = [];
  store.refCounter = 0;
  _resetAllLimits();
});

describe("createBooking — tour conversion + fingerprint enforcement", () => {
  it("rejects when the client-supplied stops fingerprint does not match server recompute", async () => {
    await expect(
      createBooking({
        data: {
          ...basePayload,
          stopsFingerprint: "0".repeat(64),
          tourConversionAckAt: new Date().toISOString(),
        },
      } as any),
    ).rejects.toThrow(/journey changed/i);
    expect(store.inserts).toHaveLength(0);
  });

  it("rejects a tour conversion without an acknowledgement", async () => {
    const fp = await goodFingerprint();
    await expect(
      createBooking({
        data: { ...basePayload, stopsFingerprint: fp, tourConversionAckAt: null },
      } as any),
    ).rejects.toThrow(/acknowledge the change/i);
    expect(store.inserts).toHaveLength(0);
  });

  it("accepts a tour conversion with a valid ack and persists scenic price + metadata", async () => {
    const fp = await goodFingerprint();
    const ack = new Date().toISOString();
    const res = await createBooking({
      data: { ...basePayload, stopsFingerprint: fp, tourConversionAckAt: ack },
    } as any);
    expect(store.inserts).toHaveLength(1);
    const row = store.inserts[0];
    // Scenic recompute mock returns 123 per vehicle * qty 1
    expect(row.price).toBe(123);
    expect(res.price).toBe(123);
    expect(row.service_type).toBe("private_tour");
    expect(row.original_service_type).toBe("direct_transfer");
    expect(row.stops_fingerprint).toBe(fp);
    expect(row.tour_conversion_ack_at).toBe(ack);
    expect(row.planned_stop_duration_seconds).toBe(200 * 60);
    expect(Array.isArray(row.selected_pois)).toBe(true);
    expect(row.selected_pois[0]).toMatchObject({ place_id: "ChIJ_stop1", minutes: 200 });
  });

  it("omits fingerprint enforcement for direct transfers with no timed stops", async () => {
    const res = await createBooking({
      data: {
        ...basePayload,
        stops: [],
        stopsFingerprint: null,
        tourConversionAckAt: null,
      },
    } as any);
    expect(store.inserts).toHaveLength(1);
    const row = store.inserts[0];
    expect(row.service_type).toBe("direct_transfer");
    expect(row.stops_fingerprint).toBeNull();
    expect(row.tour_conversion_ack_at).toBeNull();
    expect(res.id).toBe("booking-1");
  });
});
