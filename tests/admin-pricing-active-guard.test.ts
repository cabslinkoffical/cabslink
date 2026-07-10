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
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => "1.1.1.1",
  setResponseStatus: () => {},
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const captured: any[] = [];
const fakeSupabase: any = {
  rpc: async () => ({ data: true, error: null }),
  from: () => ({
    insert: (p: any) => { captured.push({ op: "insert", p }); return Promise.resolve({ error: null }); },
    update: (p: any) => ({ eq: () => { captured.push({ op: "update", p }); return Promise.resolve({ error: null }); } }),
  }),
};

import { upsertPricingRule } from "@/lib/admin.functions";

beforeEach(() => { captured.length = 0; });

describe("upsertPricingRule — legacy activation guard", () => {
  const base = {
    from_address: "Legacy from",
    to_address: "Legacy to",
    price: 100,
    currency: "GBP",
    bidirectional: false,
    active: true,
  };

  it("rejects saving an active rule without both Place IDs", async () => {
    await expect(upsertPricingRule({ data: { ...base, from_place_id: null, to_place_id: null } })).rejects.toThrow(/require both origin and destination/i);
    await expect(upsertPricingRule({ data: { ...base, from_place_id: "ChIJ_a", to_place_id: null } })).rejects.toThrow(/require both/i);
    await expect(upsertPricingRule({ data: { ...base, from_place_id: null, to_place_id: "ChIJ_b" } })).rejects.toThrow(/require both/i);
    expect(captured).toHaveLength(0);
  });

  it("allows saving an inactive legacy rule (editing/deactivation permitted)", async () => {
    await expect(
      upsertPricingRule({ data: { ...base, active: false, from_place_id: null, to_place_id: null } }),
    ).resolves.toEqual({ ok: true });
    expect(captured).toHaveLength(1);
    expect(captured[0].p.active).toBe(false);
  });

  it("allows saving an active rule with both valid Place IDs", async () => {
    await expect(
      upsertPricingRule({ data: { ...base, from_place_id: "ChIJ_a", to_place_id: "ChIJ_b" } }),
    ).resolves.toEqual({ ok: true });
    expect(captured).toHaveLength(1);
    expect(captured[0].p.active).toBe(true);
  });
});
