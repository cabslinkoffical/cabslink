import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock TanStack server-fn infra so we can invoke handlers directly ---
vi.mock("@tanstack/react-start", () => {
  const chain = (state: any = {}) => ({
    middleware: (_m: any) => chain(state),
    inputValidator: (v: any) => chain({ ...state, validator: v }),
    handler: (h: any) => async (args: any) => {
      const data = state.validator ? state.validator(args?.data) : args?.data;
      return h({ data, context: {} });
    },
  });
  return { createServerFn: (_opts?: any) => chain(), useServerFn: (fn: any) => fn };
});
vi.mock("@/lib/captcha.server", () => ({ assertCaptcha: async () => {}, verifyCaptcha: async () => ({ ok: true }), isCaptchaEnabled: () => false }));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => "9.9.9.9",
  setResponseStatus: () => {},
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

// --- Mock pricing dependencies so authoritative compute is deterministic ---
const PROFILE = {
  vehicle: { id: "22222222-2222-2222-2222-222222222222", name: "Executive", category: "car", image_url: "", passengers: 4, luggage: 4, hand_luggage: 4 },
  base_price: 10, via_price: 0, vehicle_add_price_enabled: false,
  time_extra_from: null, time_extra_to: null, time_extra_amount: 0, time_extra_type: "fixed",
  status: true, tiers: [{ tier_name: "flat", miles: 9999, cost_per_mile: 1, sort_order: 1 }],
};
let failedPricingTable: string | null = null;
const ctl = vi.hoisted(() => ({
  rules: {} as Record<string, unknown[]>,
  coordsFail: false,
  econFail: false as boolean | Error,
  stopAdded: 15,
}));
// Stop economics: deterministic £15 of stop charges per vehicle.
vi.mock("@/lib/scenic-quote.functions", async () => {
  const actual = await vi.importActual<any>("@/lib/scenic-quote.functions");
  const econ = () => ({
    thresholds: { sightseeingThresholdMinutes: 30, tourThresholdMinutes: 120, tourThresholdStops: 3, includedStopMinutes: 15, pricePerExtra15minPence: 500, maxSelectedStops: 8 },
    poiFees: new Map(), direct: { miles: 18, minutes: 25 }, effective: { miles: 20, minutes: 30 },
    drivingSeconds: 1800, plannedStopSeconds: 1200, totalJourneySeconds: 3000, detourMiles: 2, detourSeconds: 300,
    classification: { service_type: "direct_transfer", reason: "short", attraction_stops: 1, planned_attraction_minutes: 20 },
    template: null,
    stopCharges: { addedTotal: ctl.stopAdded, stopFeeTotal: 10, stopTimeTotal: 5, parkingTotal: 0, scenicFee: 0, breakdown: [] },
    fingerprint: "f".repeat(64),
  });
  return {
    ...actual,
    computeStopEconomics: vi.fn(async () => {
      if (ctl.econFail) throw ctl.econFail instanceof Error ? ctl.econFail : new Error("Routes API down");
      return econ();
    }),
    loadThresholds: async () => econ().thresholds,
    loadPoiFeesByPlaceId: async () => new Map(),
  };
});
const pricingReadClient = {
  from: (table: string) => {
    const result = () => ({
      data: table === "site_settings_public" ? { tax_enabled: false, currency: "GBP" } : [],
      error: table === failedPricingTable ? { message: "Simulated private database failure" } : null,
    });
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => result(),
          then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
        }),
      }),
    };
  },
};
vi.mock("@/lib/pricing-helpers.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pricing-helpers.server")>(
    "@/lib/pricing-helpers.server",
  );
  return {
    ...actual,
    publicClient: () => pricingReadClient,
    assertAdmin: async () => {},
    realDistanceMiles: vi.fn(async () => ({ miles: 20, minutes: 30 })),
    loadActiveProfiles: async () => [PROFILE],
    loadAreaSurcharges: async () => [],
    loadFixedPriceForRoute: async () => [],
    computeVehicleQuote: vi.fn(actual.computeVehicleQuote),
    loadRuleSets: async () => ({ ...actual.EMPTY_RULE_SETS, ...ctl.rules }),
    loadJourneyCoords: async () => {
      if (ctl.coordsFail) throw new Error("place_coords read failed");
      return new Map();
    },
  };
});

// --- Mock notifications.server so we don't try to send emails / touch logs ---
const notifyCalls = { received: 0, admin: 0 };
vi.mock("@/lib/notifications.server", () => ({
  notifyBookingReceived: vi.fn(async () => { notifyCalls.received += 1; }),
  notifyAdminNewBooking: vi.fn(async () => { notifyCalls.admin += 1; }),
}));

// --- Mock supabaseAdmin insert flow + rpc for booking-ref generation ---
const store = {
  existing: null as null | { id: string; price: number; idempotency_request_hash: string | null; booking_ref?: string },
  insertError: null as any,
  insertReturn: null as any,
  raceExisting: null as null | { id: string; price: number; idempotency_request_hash: string | null; booking_ref?: string },
  inserts: [] as any[],
  refCounter: 0,
  coupon: null as any,
  redemptions: [] as any[],
  couponCountError: null as any,
};
vi.mock("@/integrations/supabase/client.server", () => {
  const from = (table: string) => table === "coupons" || table === "coupon_redemptions" ? (() => {
    const q: any = { select: () => q, eq: () => q,
      maybeSingle: async () => ({ data: store.coupon, error: null }),
      then: (resolve: any) => resolve({ count: store.redemptions.length, error: store.couponCountError }) };
    return q;
  })() : ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: store.existing }),
      }),
    }),
    insert: (payload: any) => {
      store.inserts.push(payload);
      return {
        select: () => ({
          single: async () => {
            if (store.insertError) {
              store.existing = store.raceExisting;
              return { data: null, error: store.insertError };
            }
            return { data: store.insertReturn ?? { id: "booking-1", price: payload.price, booking_ref: payload.booking_ref }, error: null };
          },
        }),
      };
    },
  });
  const rpc = async (name: string, args?: any) => {
    if (name === "generate_booking_ref") {
      store.refCounter += 1;
      return { data: `CL-260710-TEST${store.refCounter}`, error: null };
    }
    if (name === "redeem_coupon") {
      store.redemptions.push(args);
      return { data: true, error: null };
    }
    return { data: null, error: null };
  };
  return { supabaseAdmin: { from, rpc } };
});



import { createBooking, calculateQuotes, returnScheduleProblem } from "@/lib/pricing.functions";
import * as helpers from "@/lib/pricing-helpers.server";
import { _resetAllLimits } from "@/lib/rate-limit.server";
import { bookingRequestHash } from "@/lib/booking-fingerprint";

const RETRY = "We couldn't price this right now, please try again or call us";
const base = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  vehicleId: "22222222-2222-2222-2222-222222222222",
  vehicleCount: 1,
  pickupPlaceId: "ChIJ_pickup",
  pickupLabel: "Pickup",
  destinationPlaceId: "ChIJ_dest",
  destinationLabel: "Dest",
  stops: [] as any[],
  pickupDate: "2026-08-01",
  pickupTime: "14:00",
  passengers: 2,
  luggage: 1,
  customer_name: "Alice",
  email: "alice@example.com",
  phone: "07700900123",
  child_seat: false,
  meet_greet: false,
  return_journey: false,
};
const stopped = {
  ...base,
  stops: [{ placeId: "ChIJ_stop", label: "Glencoe", minutes: 20, category: "attraction" }],
  routeMode: "scenic" as const,
};
const nothingSaved = () => {
  expect(store.inserts).toHaveLength(0);
  expect(store.refCounter).toBe(0);
  expect(notifyCalls).toEqual({ received: 0, admin: 0 });
};

beforeEach(() => {
  ctl.rules = {}; ctl.coordsFail = false; ctl.econFail = false; ctl.stopAdded = 15;
  store.existing = null; store.insertError = null; store.insertReturn = null; store.raceExisting = null;
  store.inserts = []; store.refCounter = 0; store.coupon = null; store.redemptions = []; store.couponCountError = null;
  notifyCalls.received = 0; notifyCalls.admin = 0;
  _resetAllLimits();
});

describe("B01 — stopped journeys never book when stop pricing fails", () => {
  it("a failed stop recalculation blocks the booking with the retry message", async () => {
    ctl.econFail = true;
    await expect(createBooking({ data: stopped } as any)).rejects.toThrow(RETRY);
    nothingSaved();
  });
  it("a failed stop-fee lookup blocks the booking too", async () => {
    ctl.econFail = new Error("points_of_interest read failed");
    await expect(createBooking({ data: stopped } as any)).rejects.toThrow(RETRY);
    nothingSaved();
  });
});

describe("B02 — stopped journeys use the shared rule pipeline", () => {
  it("keeps rule surcharges and adds stop charges once (£10 base + 20mi + £7 surcharge + £15 stops)", async () => {
    ctl.rules = { surchargeRules: [{ id: "s1", name: "Event surcharge", charge_type: "fixed", amount: 7, active: true, priority: 1 }] };
    const res = await createBooking({ data: stopped } as any);
    expect(res.price).toBe(52);
    expect(store.inserts[0].price).toBe(52);
    expect(store.inserts[0].pricing_snapshot.final_total).toBe(52);
    expect(store.inserts[0].pricing_snapshot.stop_fee_total).toBe(10);
  });
  it("applies a coupon exactly once on a stopped journey (£45 − £5 = £40)", async () => {
    store.coupon = { id: "33333333-3333-4333-8333-333333333333", code: "SAVE5", active: true, discount_type: "fixed", discount_value: 5, used_count: 0, stackable: true };
    const res = await createBooking({ data: { ...stopped, couponCode: "SAVE5" } } as any);
    expect(res.price).toBe(40);
    expect(store.inserts[0].pricing_snapshot.final_total).toBe(40);
    expect(store.redemptions).toHaveLength(1);
  });
  it("plain via stops keep the per-stop via price shown on the standard quote", async () => {
    const via = { ...base, stops: [{ placeId: "ChIJ_via", label: "Via" }] };
    const quote = await calculateQuotes({ data: via } as any);
    const res = await createBooking({ data: via } as any);
    expect(res.price).toBe(quote.quotes[0].finalPrice);
  });
});

describe("B03 — return journeys save and check their schedule", () => {
  it("requires a return date and time", () => {
    expect(returnScheduleProblem({ return_journey: true, pickupDate: "2026-08-01", pickupTime: "14:00" })).toMatch(/date and time/);
  });
  it("rejects a return before the outbound pickup", async () => {
    await expect(createBooking({ data: { ...base, return_journey: true, returnDate: "2026-08-01", returnTime: "13:00" } } as any))
      .rejects.toThrow(/after your outbound/);
    nothingSaved();
  });
  it("persists the return date and time", async () => {
    await createBooking({ data: { ...base, return_journey: true, returnDate: "2026-08-05", returnTime: "09:30" } } as any);
    expect(store.inserts[0]).toMatchObject({ return_journey: true, return_date: "2026-08-05", return_time: "09:30" });
  });
  it("blocks a return leg on a blocked date even when the outbound is open", async () => {
    ctl.rules = { availabilityRules: [{ id: "a1", name: "Closed", rule_scope: "global", effect: "block", date_from: "2026-08-05", date_to: "2026-08-05", customer_message: "We're closed that day.", active: true, priority: 1 }] };
    await expect(createBooking({ data: { ...base, return_journey: true, returnDate: "2026-08-05", returnTime: "09:30" } } as any))
      .rejects.toThrow(/closed that day/);
    nothingSaved();
  });
  it("one-way fingerprints are unchanged; return schedule changes the fingerprint", async () => {
    const f = (o: any) => bookingRequestHash({ ...base, vehicleCount: 1, returnJourney: false, meetGreet: false, childSeat: false, ...o });
    expect(await f({})).toBe(await f({ returnDate: "2026-08-05" }));
    expect(await f({ returnJourney: true, returnDate: "2026-08-05", returnTime: "09:30" }))
      .not.toBe(await f({ returnJourney: true, returnDate: "2026-08-06", returnTime: "09:30" }));
  });
});

describe("B06 — failed coordinate lookups fail closed when radius rules exist", () => {
  const radiusBlock = { availabilityRules: [{ id: "r1", name: "Zone", rule_scope: "global", effect: "block", lat: 55.95, lng: -3.19, radius_miles: 5, scope: "either", active: true, priority: 1 }] };
  it("no quote and no booking when a radius rule needs coordinates", async () => {
    ctl.rules = radiusBlock; ctl.coordsFail = true;
    await expect(calculateQuotes({ data: base } as any)).rejects.toThrow(RETRY);
    await expect(createBooking({ data: base } as any)).rejects.toThrow(RETRY);
    nothingSaved();
  });
  it("a failed lookup is harmless when no rule depends on a radius", async () => {
    ctl.coordsFail = true;
    await createBooking({ data: base } as any);
    expect(store.inserts).toHaveLength(1);
  });
  it("radius surcharges count too", () => {
    expect(helpers.ruleSetsNeedCoords({ ...helpers.EMPTY_RULE_SETS, modifiers: [{ lat: 1, lng: 2, radius_miles: 3, active: true }] } as any)).toBe(true);
    expect(helpers.ruleSetsNeedCoords({ ...helpers.EMPTY_RULE_SETS, modifiers: [{ lat: 1, lng: 2, radius_miles: 3, active: false }] } as any)).toBe(false);
  });
});
