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
    loadQuoteSettings: async () => ({
      taxEnabled: false, taxRate: 0, taxLabel: "VAT",
      currency: "GBP", currencySymbol: "£",
    }),
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
};
vi.mock("@/integrations/supabase/client.server", () => {
  const from = () => ({
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
  const rpc = async (name: string) => {
    if (name === "generate_booking_ref") {
      store.refCounter += 1;
      return { data: `CL-260710-TEST${store.refCounter}`, error: null };
    }
    return { data: null, error: null };
  };
  return { supabaseAdmin: { from, rpc } };
});


import { createBooking } from "@/lib/pricing.functions";
import * as helpers from "@/lib/pricing-helpers.server";
import { _resetAllLimits } from "@/lib/rate-limit.server";

const validPayload = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  vehicleId: "22222222-2222-2222-2222-222222222222",
  vehicleCount: 1,
  pickupPlaceId: "ChIJ_pickup",
  pickupLabel: "Pickup",
  destinationPlaceId: "ChIJ_dest",
  destinationLabel: "Dest",
  stops: [],
  pickupDate: "2026-08-01",
  pickupTime: "14:00",
  passengers: 2,
  luggage: 1,
  customer_name: "Alice",
  email: "alice@example.com",
  phone: "07700900123",
  flight_number: null,
  notes: null,
  child_seat: false,
  meet_greet: true,
  return_journey: false,
};

beforeEach(() => {
  store.existing = null;
  store.insertError = null;
  store.insertReturn = null;
  store.raceExisting = null;
  store.inserts = [];
  store.refCounter = 0;
  notifyCalls.received = 0;
  notifyCalls.admin = 0;
  _resetAllLimits();
  (helpers.realDistanceMiles as any).mockClear?.();
  (helpers.realDistanceMiles as any).mockImplementation?.(async () => ({ miles: 20, minutes: 30 }));
});

describe("createBooking — integration", () => {
  it("first request inserts one booking with server-computed price, distance and booking_ref", async () => {
    const res = await createBooking({ data: validPayload });
    expect(store.inserts).toHaveLength(1);
    expect(res.id).toBe("booking-1");
    expect(res.ref).toMatch(/^CL-\d{6}-/);
    expect(typeof res.token).toBe("string");
    expect((res.token as string)).toMatch(/^[0-9a-f]{64}$/);
    // 20 mi * £1/mi + £10 base = £30
    expect(store.inserts[0].price).toBe(30);
    expect(store.inserts[0].distance_miles).toBe(20);
    expect(store.inserts[0].idempotency_key).toBe(validPayload.idempotencyKey);
    expect(store.inserts[0].idempotency_request_hash).toMatch(/^[0-9a-f]{64}$/);
    // Booking reference must come from server (RPC), not the input payload.
    expect(store.inserts[0].booking_ref).toBe(res.ref);
    // Notifications fire best-effort after successful insert.
    expect(notifyCalls.received).toBe(1);
    expect(notifyCalls.admin).toBe(1);
  });

  it("writes vehicle + pricing snapshot columns onto the booking row", async () => {
    await createBooking({ data: validPayload });
    const row = store.inserts[0];
    expect(row.vehicle_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(row.vehicle_name_snapshot).toBe("Executive");
    expect(row.vehicle_capacity_snapshot).toMatchObject({
      passengers: 4, luggage: 4, hand_luggage: 4, vehicle_count: 1,
    });
    expect(row.pricing_snapshot).toBeTruthy();
    expect(row.pricing_snapshot.engine_version).toBe(1);
    expect(row.pricing_snapshot.total_price).toBe(30);
    expect(row.pricing_snapshot.distance_miles).toBe(20);
    expect(row.pricing_snapshot.vehicle_count).toBe(1);
    expect(row.pricing_snapshot.fixed_price_applied).toBe(false);
    expect(Array.isArray(row.pricing_snapshot.breakdown)).toBe(true);
  });



  it("ignores a frontend-supplied booking_ref — server issues its own", async () => {
    const spiked: any = { ...validPayload, booking_ref: "CL-000000-HACK", bookingRef: "CL-000000-HACK" };
    const res = await createBooking({ data: spiked });
    expect(res.ref).not.toBe("CL-000000-HACK");
    expect(store.inserts[0].booking_ref).toBe(res.ref);
  });

  it("same idempotency key + same payload recovers the confirmation access (no duplicate insert, no new notifications)", async () => {
    const first = await createBooking({ data: validPayload });
    store.existing = { id: first.id, price: 30, idempotency_request_hash: store.inserts[0].idempotency_request_hash, booking_ref: first.ref };
    notifyCalls.received = 0;
    notifyCalls.admin = 0;
    const again = await createBooking({ data: validPayload });
    expect(again.id).toBe(first.id);
    expect(again.price).toBe(30);
    expect(again.ref).toBe(first.ref);
    // Deterministic HMAC token: same booking → same token, so a lost first
    // response can still deliver a usable confirmation URL.
    expect(again.token).toBe(first.token);
    expect(store.inserts).toHaveLength(1);
    // Duplicate submissions do not re-fire notifications.
    expect(notifyCalls.received).toBe(0);
    expect(notifyCalls.admin).toBe(0);
  });

  it("same idempotency key + different payload is rejected as conflict", async () => {
    await createBooking({ data: validPayload });
    store.existing = { id: "booking-1", price: 30, idempotency_request_hash: store.inserts[0].idempotency_request_hash };
    await expect(
      createBooking({ data: { ...validPayload, passengers: 4 } }),
    ).rejects.toThrow(/conflicts with an earlier submission/i);
    expect(store.inserts).toHaveLength(1);
  });

  it("DB unique-violation race returns the existing booking with a recovered token when hash matches", async () => {
    await createBooking({ data: validPayload });
    const goodHash = store.inserts[0].idempotency_request_hash;
    store.inserts = [];

    store.existing = null;
    store.insertError = { code: "23505" };
    store.raceExisting = { id: "booking-race", price: 30, idempotency_request_hash: goodHash, booking_ref: "CL-260710-RACE" };
    const res = await createBooking({ data: validPayload });
    expect(res.id).toBe("booking-race");
    expect(res.price).toBe(30);
    expect(res.token).toMatch(/^[0-9a-f]{64}$/); // recovered, not null

    store.existing = null;
    store.insertError = { code: "23505" };
    store.raceExisting = { id: "booking-other", price: 999, idempotency_request_hash: "deadbeef".repeat(8) };
    await expect(createBooking({ data: validPayload })).rejects.toThrow(/conflicts with an earlier submission/i);
  });



  it("Google route failure prevents insertion", async () => {
    (helpers.realDistanceMiles as any).mockImplementation(async () => { throw new Error("Distance calculation is temporarily unavailable. Please try again."); });
    await expect(createBooking({ data: validPayload })).rejects.toThrow(/temporarily unavailable/i);
    expect(store.inserts).toHaveLength(0);
  });

  it("ignores client-supplied price and distance — stored values come from the server", async () => {
    const spiked: any = { ...validPayload, price: 1, distanceMiles: 1, finalPrice: 1, mileageRate: 0 };
    await createBooking({ data: spiked });
    expect(store.inserts[0].price).toBe(30);
    expect(store.inserts[0].distance_miles).toBe(20);
  });

  it("rate-limited requests do not reach the insert operation", async () => {
    _resetAllLimits();
    // Fire 10 unique-key requests to exhaust the 10/10min bucket.
    for (let i = 0; i < 10; i++) {
      const key = `11111111-1111-4111-8111-1111111111${String(i).padStart(2, "0")}`.slice(0, 36);
      const uuid = `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`;
      store.insertReturn = { id: `b-${i}`, price: 30 };
      await createBooking({ data: { ...validPayload, idempotencyKey: uuid } });
      void key;
    }
    const before = store.inserts.length;
    await expect(
      createBooking({ data: { ...validPayload, idempotencyKey: "11111111-1111-4111-8111-999999999999" } }),
    ).rejects.toThrow(/too many booking attempts/i);
    expect(store.inserts.length).toBe(before);
  });

  it("notification failure does not roll back the successful booking insert", async () => {
    const notif = await import("@/lib/notifications.server");
    (notif.notifyBookingReceived as any).mockImplementationOnce(async () => { throw new Error("smtp down"); });
    (notif.notifyAdminNewBooking as any).mockImplementationOnce(async () => { throw new Error("smtp down"); });
    const res = await createBooking({ data: validPayload });
    expect(res.id).toBe("booking-1");
    expect(store.inserts).toHaveLength(1);
  });
});

