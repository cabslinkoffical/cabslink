import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => {
  const chain = (state: any = {}) => ({
    middleware: (_m: any) => chain(state),
    inputValidator: (v: any) => chain({ ...state, validator: v }),
    handler: (h: any) => async (args: any) => {
      const data = state.validator ? state.validator(args?.data) : args?.data;
      return h({ data, context: { supabase: fakeSupabase, userId: "admin-user" } });
    },
  });
  return { createServerFn: (_opts?: any) => chain(), useServerFn: (fn: any) => fn };
});
vi.mock("@tanstack/react-start/server", () => ({ getRequestIP: () => "1.1.1.1", setResponseStatus: () => {} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
// The save routine is no longer callable by signed-in accounts; the server
// function verifies the admin role, then calls it with the trusted client.
vi.mock("@/integrations/supabase/client.server", () => ({ get supabaseAdmin() { return fakeSupabase; } }));

const rpcCalls: Array<{ name: string; args: any }> = [];
const tableWrites: Array<{ table: string; op: string }> = [];
let rpcFails = false;

const fakeSupabase: any = {
  rpc: async (name: string, args: any) => {
    rpcCalls.push({ name, args });
    if (name === "has_role") return { data: true, error: null };
    if (rpcFails) return { data: null, error: { message: "band write failed" } };
    return { data: "profile-1", error: null };
  },
  from: (table: string) => ({
    insert: () => {
      tableWrites.push({ table, op: "insert" });
      return { select: () => ({ single: async () => ({ data: { id: "x" }, error: null }) }) };
    },
    update: () => {
      tableWrites.push({ table, op: "update" });
      return { eq: async () => ({ error: null }) };
    },
    delete: () => {
      tableWrites.push({ table, op: "delete" });
      return { eq: async () => ({ error: null }) };
    },
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  }),
};

import { saveSchemeOverview } from "@/lib/pricing-schemes.functions";

const payload = {
  classId: "11111111-1111-4111-8111-111111111111",
  finalTierOpenEnded: true,
  cityFixedPrice: 40,
  cityIncludedMiles: 5,
  bands: [{ name: "Short", miles: 20, perMile: 2.2 }],
  additionalPickupFee: 5,
  waitingFeePerMinute: 0.5,
  airportPickupFee: 6,
  connectingJobDiscountPercent: 10,
  pricePerHour: 50,
  minHours: 3,
  maxHours: 12,
  dailyPrice: 350,
  includedHoursPerDay: 8,
  includedMilesPerDay: 120,
  extraMileRate: 1.6,
  hourlyActive: true,
  live: true,
};

beforeEach(() => {
  rpcCalls.length = 0;
  tableWrites.length = 0;
  rpcFails = false;
});

describe("saveSchemeOverview — atomic, class-authoritative save", () => {
  it("sends only the class id plus pricing payload to one database routine", async () => {
    const res: any = await (saveSchemeOverview as any)({ data: payload });
    expect(res.ok).toBe(true);
    const save = rpcCalls.find((c) => c.name === "save_pricing_scheme_base");
    expect(save).toBeTruthy();
    expect(save!.args._payload.class_id).toBe(payload.classId);
    expect(save!.args._payload).not.toHaveProperty("vehicle_id");
  });

  it("performs no pre-transaction table mutations (no class link / vehicle insert before the routine)", async () => {
    await (saveSchemeOverview as any)({ data: payload });
    expect(tableWrites).toEqual([]);
  });

  it("leaves nothing mutated when the routine fails (all-or-nothing)", async () => {
    rpcFails = true;
    await expect((saveSchemeOverview as any)({ data: payload })).rejects.toThrow(/band write failed/);
    expect(tableWrites).toEqual([]);
    expect(rpcCalls.filter((c) => c.name === "save_pricing_scheme_base")).toHaveLength(1);
  });

  it("passes daily pricing through to the routine", async () => {
    await (saveSchemeOverview as any)({ data: payload });
    const p = rpcCalls.find((c) => c.name === "save_pricing_scheme_base")!.args._payload;
    expect(p.daily_price).toBe(350);
    expect(p.included_hours_per_day).toBe(8);
    expect(p.included_miles_per_day).toBe(120);
    expect(p.extra_mile_rate).toBe(1.6);
  });

  it("omits daily pricing (null) when it is unused, keeping hourly behaviour unchanged", async () => {
    await (saveSchemeOverview as any)({
      data: { ...payload, dailyPrice: 0, includedHoursPerDay: 0, includedMilesPerDay: 0, extraMileRate: 0 },
    });
    const p = rpcCalls.find((c) => c.name === "save_pricing_scheme_base")!.args._payload;
    expect(p.daily_price).toBeNull();
    expect(p.included_hours_per_day).toBeNull();
    expect(p.price_per_hour).toBe(50);
  });

  it("rejects a payload that tries to drive pricing by a vehicle id instead of a class", async () => {
    await expect((saveSchemeOverview as any)({ data: { ...payload, classId: undefined } })).rejects.toThrow();
  });
});
