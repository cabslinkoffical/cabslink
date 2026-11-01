import { describe, it, expect, vi } from "vitest";

vi.mock("@tanstack/react-start", () => {
  const chain = (state: any = {}) => ({
    middleware: () => chain(state),
    inputValidator: (v: any) => chain({ ...state, validator: v }),
    handler: (h: any) => async (args: any) => h({ data: state.validator ? state.validator(args?.data) : args?.data, context: args.context }),
  });
  return { createServerFn: () => chain(), useServerFn: (fn: any) => fn };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { fetchAllPages } from "@/lib/fetch-all-pages";
import { revenueByBucket, revenueInWindow, settlementWindowFilter } from "@/lib/revenue";
import { getSettings, updateSettings, settingsSavePayload } from "@/lib/admin.functions";

describe("A01 — complete reads never stop at the response cap", () => {
  const rows = Array.from({ length: 23 }, (_, i) => ({ id: i, email: `c${i}@x.com`, price: 10 }));
  const pager = (fail = false) => vi.fn(async (a: number, z: number) =>
    fail && a > 0 ? { data: null, error: { message: "page 2 failed" } } : { data: rows.slice(a, z + 1), error: null });

  it("totals and grouping include rows beyond the first page", async () => {
    const all = await fetchAllPages<any>(pager(), 5);
    expect(all).toHaveLength(23);
    expect(all.reduce((s, r) => s + r.price, 0)).toBe(230);
  });
  it("search finds a row that lives beyond page one", async () => {
    const all = await fetchAllPages<any>(pager(), 5);
    expect(all.find((r) => r.email === "c21@x.com")).toBeTruthy();
  });
  it("a failed later page throws instead of returning partial data", async () => {
    await expect(fetchAllPages<any>(pager(true), 5)).rejects.toThrow("page 2 failed");
  });
});

describe("A03 — revenue is filtered, totalled and bucketed by settlement time", () => {
  const start = "2026-10-01T00:00:00.000Z";
  const end = "2026-10-31T23:59:59.999Z";
  const rows = [
    { amount: 100, created_at: "2026-09-20T10:00:00Z", paid_at: "2026-10-02T10:00:00Z" }, // created before, paid inside → counted
    { amount: 50, created_at: "2026-10-30T10:00:00Z", paid_at: "2026-11-02T10:00:00Z" },  // created inside, paid after → excluded
    { amount: 20, created_at: "2026-10-15T10:00:00Z", paid_at: null },                    // no paid_at → created_at
    { amount: 5, created_at: "2026-09-01T00:00:00Z", paid_at: end },                      // boundary → included
    { amount: 40, refunded_amount: 10, status: "partial", created_at: "2026-10-05T00:00:00Z", paid_at: "2026-10-05T00:00:00Z" },
  ];
  it("applies one policy with inclusive boundaries and net refunds", () => {
    expect(revenueInWindow(rows, start, end)).toBe(155);
  });
  it("the sum of buckets equals the period total", () => {
    const inside = rows.filter((r) => r.paid_at !== "2026-11-02T10:00:00Z");
    const buckets = revenueByBucket(inside, (iso) => iso.slice(0, 10));
    expect([...buckets.values()].reduce((s, v) => s + v, 0)).toBe(revenueInWindow(rows, start, end));
  });
  it("the database filter uses the same rule", () => {
    expect(settlementWindowFilter(start, end)).toBe(
      `and(paid_at.gte.${start},paid_at.lte.${end}),and(paid_at.is.null,created_at.gte.${start},created_at.lte.${end})`);
  });
});

describe("A12 — settings never load half-way or save partially", () => {
  const ctx = (tables: Record<string, any>, rpc = vi.fn(async (n: string) => ({ data: n === "has_role" ? true : null, error: null }))) => ({
    userId: "u1",
    supabase: {
      rpc,
      from: (t: string) => {
        const q: any = { select: () => q, eq: () => q, maybeSingle: async () => tables[t], update: vi.fn(() => q), upsert: vi.fn(async () => ({ error: null })), insert: async () => ({ error: null }) };
        return q;
      },
    },
  });

  it("a failed credentials read blocks the settings form", async () => {
    const c = ctx({ site_settings: { data: { id: 1, company_name: "Cabslink" }, error: null }, site_credentials: { data: null, error: { message: "denied" } } });
    await expect((getSettings as any)({ context: c })).rejects.toThrow(/could not be loaded completely/);
  });

  it("omitted fields stay unchanged; explicit null clears", () => {
    const base = { company_name: "Cabslink", primary_color: "#0E182C", currency: "GBP", timezone: "Europe/London", tax_percentage: 0, maintenance_mode: false };
    const { settings, credentials } = settingsSavePayload({ ...base, smtp_host: null });
    expect(settings).not.toHaveProperty("policy_flexible_percent");
    expect(settings).not.toHaveProperty("child_seat_fee_pence");
    expect(credentials).toEqual({ smtp_host: null });
  });

  it("both groups go through one transactional call; a failure saves nothing separately", async () => {
    const rpc = vi.fn(async (n: string) => n === "has_role" ? { data: true, error: null } : { data: null, error: { message: "credentials write failed" } });
    const c = ctx({}, rpc);
    const from = vi.spyOn(c.supabase, "from");
    const base = { company_name: "Cabslink", primary_color: "#0E182C", currency: "GBP", timezone: "Europe/London", tax_percentage: 0, maintenance_mode: false, smtp_host: "smtp.x" };
    await expect((updateSettings as any)({ data: base, context: c })).rejects.toThrow(/were not saved/);
    expect(rpc).toHaveBeenCalledWith("admin_save_settings", expect.objectContaining({ p_credentials: { smtp_host: "smtp.x" } }));
    expect(from).not.toHaveBeenCalledWith("site_settings");
    expect(from).not.toHaveBeenCalledWith("site_credentials");
  });
});
