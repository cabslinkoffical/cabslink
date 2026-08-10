import { describe, it, expect, beforeEach, vi } from "vitest";
import { _resetAllLimits } from "@/lib/rate-limit.server";
import fs from "node:fs";

const insertSpy = vi.fn();
vi.mock("@/lib/notifications.server", () => ({
  notifyEnquiry: vi.fn(async () => {}),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: (row: any) => { insertSpy(row); return Promise.resolve({ error: null }); } }) },
}));

async function importFn() {
  vi.resetModules();
  const mod = await import("@/lib/corporate.functions");
  return (data: any) => mod.submitCorporateInquiryImpl(data, { ip: "1.2.3.4" });
}

const validPayload = {
  company: "Acme Co", name: "Jane Doe", email: "jane@acme.com",
  phone: "+441234567890", needs: "We need weekly airport transfers for staff.", website: "",
};

describe("submitCorporateInquiry", () => {
  beforeEach(() => { insertSpy.mockClear(); _resetAllLimits(); });

  it("accepts a valid submission and inserts into contact_messages", async () => {
    const fn = await importFn();
    const res = await fn(validPayload);
    expect(res).toEqual({ ok: true });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const row = insertSpy.mock.calls[0][0];
    expect(row.email).toBe("jane@acme.com");
    expect(row.subject).toMatch(/corporate/i);
  });

  it("rejects invalid email", async () => {
    const fn = await importFn();
    await expect(fn({ ...validPayload, email: "not-email" })).rejects.toBeTruthy();
  });

  it("rejects when required fields missing", async () => {
    const fn = await importFn();
    await expect(fn({ ...validPayload, company: "" })).rejects.toBeTruthy();
    await expect(fn({ ...validPayload, needs: "" })).rejects.toBeTruthy();
  });

  it("honeypot silently succeeds without insert", async () => {
    const fn = await importFn();
    const res = await fn({ ...validPayload, website: "http://spam" });
    expect(res).toEqual({ ok: true });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rate-limits after 5 submissions per IP window", async () => {
    const fn = await importFn();
    for (let i = 0; i < 5; i++) {
      await fn({ ...validPayload, needs: `Different message body ${i} ${Math.random()}` });
    }
    await expect(fn({ ...validPayload, needs: "another message body here" }))
      .rejects.toThrow(/too many/i);
  });

  it("deduplicates identical payloads without a second insert", async () => {
    const fn = await importFn();
    await fn(validPayload);
    await fn(validPayload);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });
});

describe("corporate route wiring", () => {
  it("corporate-booking.tsx contains no direct supabase.from write", () => {
    const src = fs.readFileSync("src/routes/corporate-booking.tsx", "utf8");
    expect(src).not.toMatch(/supabase\.from\(['"]contact_messages['"]\)/);
  });
});
