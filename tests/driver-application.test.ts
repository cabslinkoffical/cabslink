import { describe, it, expect, beforeEach, vi } from "vitest";
import { _resetAllLimits } from "@/lib/rate-limit.server";
import fs from "node:fs";

const insertSpy = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: (row: any) => { insertSpy(row); return Promise.resolve({ error: null }); } }) },
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => "5.6.7.8",
  setResponseStatus: () => {},
}));

async function importFn() {
  const mod = await import("@/lib/driver-application.functions");
  return (mod.submitDriverApplication as any);
}

const valid = {
  name: "Alex Driver", email: "alex@example.com", phone: "+441234567890",
  message: "5 years chauffeur experience, PCO licence, full clean UK licence.",
  website: "",
};

describe("submitDriverApplication", () => {
  beforeEach(() => { insertSpy.mockClear(); _resetAllLimits(); vi.resetModules(); });

  it("accepts a valid application", async () => {
    const fn = await importFn();
    const res = await fn({ data: valid });
    expect(res).toEqual({ ok: true });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0].subject).toMatch(/driver|partner/i);
  });

  it("rejects invalid email and short messages", async () => {
    const fn = await importFn();
    await expect(fn({ data: { ...valid, email: "nope" } })).rejects.toBeTruthy();
    await expect(fn({ data: { ...valid, message: "hi" } })).rejects.toBeTruthy();
  });

  it("honeypot silently succeeds", async () => {
    const fn = await importFn();
    const res = await fn({ data: { ...valid, website: "https://spam.example" } });
    expect(res).toEqual({ ok: true });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rate-limits after 5 submissions", async () => {
    const fn = await importFn();
    for (let i = 0; i < 5; i++) {
      await fn({ data: { ...valid, message: `unique application message ${i} ${Math.random()}` } });
    }
    await expect(fn({ data: { ...valid, message: "one more application text here" } }))
      .rejects.toThrow(/too many/i);
  });

  it("deduplicates identical submissions", async () => {
    const fn = await importFn();
    await fn({ data: valid });
    await fn({ data: valid });
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });
});

describe("driver-application route wiring", () => {
  it("drive-with-us.tsx contains no direct supabase.from write", () => {
    const src = fs.readFileSync("src/routes/drive-with-us.tsx", "utf8");
    expect(src).not.toMatch(/supabase\.from\(['"]contact_messages['"]\)/);
  });
});
