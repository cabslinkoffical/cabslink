import { describe, it, expect, beforeEach, vi } from "vitest";
import { _resetAllLimits } from "@/lib/rate-limit.server";
import fs from "node:fs";

const insertSpy = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: (row: any) => { insertSpy(row); return Promise.resolve({ error: null }); } }) },
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => "1.2.3.4",
  setResponseStatus: () => {},
}));

async function importFn() {
  const mod = await import("@/lib/corporate.functions");
  // Use the underlying handler if the createServerFn wrapper exposes it.
  const fn: any = (mod.submitCorporateInquiry as any);
  return fn;
}

const validPayload = {
  company: "Acme Co", name: "Jane Doe", email: "jane@acme.com",
  phone: "+441234567890", needs: "We need weekly airport transfers for staff.", website: "",
};

describe("submitCorporateInquiry", () => {
  beforeEach(() => { insertSpy.mockClear(); _resetAllLimits(); vi.resetModules(); });

  it("accepts a valid submission and inserts into contact_messages", async () => {
    const fn = await importFn();
    const res = await fn({ data: validPayload });
    expect(res).toEqual({ ok: true });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const row = insertSpy.mock.calls[0][0];
    expect(row.email).toBe("jane@acme.com");
    expect(row.subject).toMatch(/corporate/i);
    // Server-set subject, not client-controlled; disallowed fields absent.
    expect(row).not.toHaveProperty("submission_type_from_client");
  });

  it("rejects invalid email", async () => {
    const fn = await importFn();
    await expect(fn({ data: { ...validPayload, email: "not-email" } })).rejects.toBeTruthy();
  });

  it("rejects when required fields missing", async () => {
    const fn = await importFn();
    await expect(fn({ data: { ...validPayload, company: "" } })).rejects.toBeTruthy();
    await expect(fn({ data: { ...validPayload, needs: "" } })).rejects.toBeTruthy();
  });

  it("honeypot silently succeeds without insert", async () => {
    const fn = await importFn();
    const res = await fn({ data: { ...validPayload, website: "http://spam" } });
    expect(res).toEqual({ ok: true });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rate-limits after 5 submissions per IP window", async () => {
    const fn = await importFn();
    for (let i = 0; i < 5; i++) {
      await fn({ data: { ...validPayload, needs: `Different message body ${i} ${Math.random()}` } });
    }
    await expect(fn({ data: { ...validPayload, needs: "another message body here" } }))
      .rejects.toThrow(/too many/i);
  });

  it("deduplicates identical payloads without a second insert", async () => {
    const fn = await importFn();
    await fn({ data: validPayload });
    await fn({ data: validPayload });
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });
});

describe("corporate route wiring", () => {
  it("corporate-booking.tsx contains no direct supabase.from write", () => {
    const src = fs.readFileSync("src/routes/corporate-booking.tsx", "utf8");
    expect(src).not.toMatch(/supabase\.from\(['"]contact_messages['"]\)/);
  });
});
