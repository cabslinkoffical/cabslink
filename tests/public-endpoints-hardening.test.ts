import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

import { clientIpFromHeaders } from "@/lib/client-ip.server";
import { sanitizeSearchTerm } from "@/lib/search-sanitize";
import { BOOKING_REF_RE, NEW_BOOKING_REF_RE, isValidBookingRef } from "@/lib/booking-ref";
import { hitRateLimit, type RateLimitRpc } from "@/lib/db-rate-limit.server";
import { verifyCaptcha } from "@/lib/captcha.server";
import { findBooking, normaliseIdentity, GENERIC_NOT_FOUND } from "@/lib/manage-booking.functions";
import { findCouponExact } from "@/lib/pricing.functions";

/** Tiny fake of the PostgREST builder that only supports eq/is/limit/maybeSingle. */
function fakeDb(tables: Record<string, any[]>) {
  const calls: { table: string; op: string; col: string; val: unknown }[] = [];
  const db = {
    calls,
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const q: any = {
        select: () => q,
        is: (c: string, v: unknown) => { rows = rows.filter((r) => (r[c] ?? null) === v); return q; },
        eq: (c: string, v: unknown) => { calls.push({ table, op: "eq", col: c, val: v }); rows = rows.filter((r) => r[c] === v); return q; },
        ilike: () => { throw new Error("ilike must not be used"); },
        limit: () => Promise.resolve({ data: rows, error: null }),
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (res: any) => res({ data: rows, error: null, count: rows.length }),
      };
      return q;
    },
  };
  return db;
}

const BOOKING = { booking_ref: "CL-261004-ABCD", email: "jane@example.com", customer_name: "Jane Doe", deleted_at: null };

describe("customer booking lookup", () => {
  const db = fakeDb({ bookings: [BOOKING] });
  it("finds a booking with reference + exact email (case-insensitive input)", async () => {
    const row = await findBooking({ bookingRef: "cl-261004-abcd", email: " JANE@example.com ", lastName: "Doe" }, db);
    expect(row?.booking_ref).toBe("CL-261004-ABCD");
    expect(db.calls.some((c) => c.op === "eq" && c.col === "email" && c.val === "jane@example.com")).toBe(true);
  });
  it.each([
    ["wrong email", { bookingRef: "CL-261004-ABCD", email: "other@example.com" }],
    ["unknown reference", { bookingRef: "CL-261004-ZZZZ", email: "jane@example.com" }],
    ["bad format", { bookingRef: "<script>", email: "nope" }],
    ["missing email", { bookingRef: "CL-261004-ABCD", email: "" }],
    ["wildcard email", { bookingRef: "CL-261004-ABCD", email: "%@example.com" }],
    ["underscore wildcard", { bookingRef: "CL-261004-ABCD", email: "jan_@example.com" }],
  ])("returns null (→ generic error) for %s", async (_l, id) => {
    expect(await findBooking(id, db)).toBeNull();
  });
  it("uses one generic message", () => {
    expect(GENERIC_NOT_FOUND).toMatch(/couldn't match those details/);
    expect(normaliseIdentity({ bookingRef: "CL-1", email: "a@b.co" })).not.toBeNull();
  });
});

describe("promo codes", () => {
  const db = fakeDb({
    coupons: [{ id: "c1", code: "SAVE10", active: true }],
    coupon_redemptions: [{ coupon_id: "c1", customer_email: "jane@example.com" }],
  });
  it("matches exactly on the upper-cased code (anonymous visitor, admin client)", async () => {
    const r = await findCouponExact(db, " save10 ", "JANE@example.com");
    expect(r.coupon?.id).toBe("c1");
    expect(r.customerRedemptions).toBe(1);
  });
  it("does not match partial or wildcard codes", async () => {
    expect((await findCouponExact(db, "SAVE")).coupon).toBeNull();
    expect((await findCouponExact(db, "SAVE%")).coupon).toBeNull();
    expect((await findCouponExact(db, "SAVE1_")).coupon).toBeNull();
  });
});

describe("client IP", () => {
  it("prefers cf-connecting-ip", () => {
    expect(clientIpFromHeaders(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
  });
  it("falls back to the last x-forwarded-for value", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1, 2.2.2.2" }))).toBe("2.2.2.2");
  });
  it("returns unknown when nothing is present", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("rate limiter", () => {
  // Fake RPC with the same semantics as public.rate_limit_hit.
  function fakeRpc() {
    let now = 0;
    const store = new Map<string, { start: number; hits: number }>();
    const rpc: RateLimitRpc = async ({ _key, _max, _window_seconds }) => {
      const cur = store.get(_key);
      const row = !cur || cur.start <= now - _window_seconds * 1000 ? { start: now, hits: 1 } : { start: cur.start, hits: cur.hits + 1 };
      store.set(_key, row);
      return { data: [{ allowed: row.hits <= _max, hits: row.hits }], error: null };
    };
    return { rpc, advance: (ms: number) => { now += ms; } };
  }
  it("blocks after the limit and resets after the window", async () => {
    const { rpc, advance } = fakeRpc();
    const rule = { name: "t", max: 3, windowSeconds: 60 };
    for (let i = 0; i < 3; i++) expect(await hitRateLimit(rule, "ip", rpc)).toBe(true);
    expect(await hitRateLimit(rule, "ip", rpc)).toBe(false);
    expect(await hitRateLimit(rule, "other-ip", rpc)).toBe(true);
    advance(60_001);
    expect(await hitRateLimit(rule, "ip", rpc)).toBe(true);
  });
  it("falls back to the in-memory limiter when the database fails", async () => {
    const rpc: RateLimitRpc = async () => ({ data: null, error: new Error("down") });
    const rule = { name: "fallback-test", max: 1, windowSeconds: 60 };
    expect(await hitRateLimit(rule, "ip", rpc)).toBe(true);
    expect(await hitRateLimit(rule, "ip", rpc)).toBe(false);
  });
});

describe("booking references", () => {
  it("accepts the new 8-character format", () => {
    expect(NEW_BOOKING_REF_RE.test("CL-261004-AB3K9QZX")).toBe(true);
    expect(isValidBookingRef("CL-261004-AB3K9QZX")).toBe(true);
  });
  it("keeps old 4-character references valid", () => {
    expect(isValidBookingRef("CL-260918-UX9B")).toBe(true);
    expect(BOOKING_REF_RE.test("CL-260918-UX9")).toBe(false);
  });
});

describe("captcha in production", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { process.env["TURNSTILE_SECRET_KEY"] = "secret"; });
  afterEach(() => { globalThis.fetch = realFetch; delete process.env["TURNSTILE_SECRET_KEY"]; });
  it("fails closed when the verifier is unreachable", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("down"); }) as unknown as typeof fetch;
    expect((await verifyCaptcha("tok", "1.1.1.1", { production: true })).ok).toBe(false);
  });
  it("fails closed on a non-200 reply or our own config error", async () => {
    globalThis.fetch = vi.fn(async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    expect((await verifyCaptcha("tok", undefined, { production: true })).ok).toBe(false);
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-secret"] }))) as unknown as typeof fetch;
    expect((await verifyCaptcha("tok", undefined, { production: true })).ok).toBe(false);
  });
  it("fails closed when the secret is missing", async () => {
    delete process.env["TURNSTILE_SECRET_KEY"];
    expect((await verifyCaptcha("tok", undefined, { production: true })).ok).toBe(false);
  });
});

describe("search sanitiser", () => {
  it("strips commas, brackets, % and _", () => {
    expect(sanitizeSearchTerm("a,b(c)[d]{e}%f_g")).toBe("a b c d e f g");
    expect(sanitizeSearchTerm("%%__")).toBe("");
  });
});
