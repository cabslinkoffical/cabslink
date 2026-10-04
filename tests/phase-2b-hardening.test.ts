import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

import {
  applyPaidSession,
  hostFromRequest,
  resolveStripeEnvForHost,
  sandboxRejected,
} from "@/lib/stripe-payments.server";
import { verifyCaptcha } from "@/lib/captcha.server";
import { findBooking } from "@/lib/manage-booking.functions";
import { LIMITS } from "@/lib/db-rate-limit.server";

const ORIGINAL_APP_ENV = process.env["APP_ENV"];
afterEach(() => {
  if (ORIGINAL_APP_ENV === undefined) delete process.env["APP_ENV"];
  else process.env["APP_ENV"] = ORIGINAL_APP_ENV;
});

describe("spoofed X-Forwarded-Host", () => {
  const spoofed = new Request("https://cabslink.com/_serverFn/x", {
    headers: { "x-forwarded-host": "localhost", host: "cabslink.com" },
  });

  it("is ignored: the host comes from the request URL only", () => {
    expect(hostFromRequest(spoofed)).toBe("cabslink.com");
  });

  it("still selects live Stripe on a production host", () => {
    delete process.env["APP_ENV"];
    expect(resolveStripeEnvForHost(hostFromRequest(spoofed))).toBe("live");
  });

  it("APP_ENV=production forces live even for a localhost URL", () => {
    process.env["APP_ENV"] = "production";
    expect(resolveStripeEnvForHost("localhost")).toBe("live");
    expect(sandboxRejected("sandbox")).toBe(true);
  });

  it("non-production APP_ENV still allows sandbox on preview hosts", () => {
    process.env["APP_ENV"] = "preview";
    expect(resolveStripeEnvForHost("localhost")).toBe("sandbox");
    expect(sandboxRejected("sandbox")).toBe(false);
  });

  it("captcha stays strict with APP_ENV=production (missing token rejected)", async () => {
    process.env["APP_ENV"] = "production";
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    expect((await verifyCaptcha("", "1.1.1.1")).ok).toBe(false);
  });
});

describe("sandbox sessions in production", () => {
  it("are refused and logged as payment_sandbox_rejected; booking unchanged", async () => {
    process.env["APP_ENV"] = "production";
    const writes: { table: string; op: string; payload: any }[] = [];
    const booking = {
      id: "b1", booking_ref: "CL-261004-ABCDEFGH", price: 50, quoted_total: null,
      quote_expires_at: null, email: "a@b.co", status: "new", payment_status: "unpaid",
    };
    const db: any = {
      from(table: string) {
        const q: any = {
          select: () => q, eq: () => q, in: () => q, is: () => q,
          maybeSingle: async () => ({ data: table === "bookings" ? booking : null, error: null }),
          insert: async (p: any) => { writes.push({ table, op: "insert", payload: p }); return { error: null }; },
          update: (p: any) => { writes.push({ table, op: "update", payload: p }); return q; },
          upsert: async (p: any) => { writes.push({ table, op: "upsert", payload: p }); return { error: null }; },
          delete: () => { writes.push({ table, op: "delete", payload: null }); return q; },
        };
        return q;
      },
    };
    const session: any = {
      id: "cs_test_1", payment_status: "paid", currency: "gbp", amount_total: 5000,
      metadata: { booking_ref: "CL-261004-ABCDEFGH" },
    };
    const res = await applyPaidSession({ session, env: "sandbox" }, { db });
    expect(res.applied).toBe(false);
    expect(writes.filter((w) => w.table !== "activity_logs")).toEqual([]);
    expect(writes.find((w) => w.table === "activity_logs")?.payload.action).toBe("payment_sandbox_rejected");
  });
});

describe("mixed-case email bookings", () => {
  it("John.Smith@Gmail.com finds the (lower-cased) saved booking", async () => {
    const rows = [{ booking_ref: "CL-261004-ABCDEFGH", email: "john.smith@gmail.com", customer_name: "John Smith", deleted_at: null }];
    const db: any = {
      from() {
        let r = [...rows];
        const q: any = {
          select: () => q,
          is: (c: string, v: unknown) => { r = r.filter((x: any) => (x[c] ?? null) === v); return q; },
          eq: (c: string, v: unknown) => { r = r.filter((x: any) => x[c] === v); return q; },
          limit: async () => ({ data: r, error: null }),
        };
        return q;
      },
    };
    const row = await findBooking({ bookingRef: "CL-261004-ABCDEFGH", email: "John.Smith@Gmail.com" }, db);
    expect(row?.booking_ref).toBe("CL-261004-ABCDEFGH");
  });
});

describe("shared limiter names", () => {
  it("every limit has a unique name (hourly no longer collides with createBooking)", () => {
    const names = Object.values(LIMITS).map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
    expect(LIMITS.hourlyBooking.name).not.toBe(LIMITS.createBooking.name);
  });
});
