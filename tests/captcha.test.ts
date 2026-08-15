import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { verifyCaptcha, isCaptchaEnabled, assertCaptcha } from "@/lib/captcha.server";

const realFetch = globalThis.fetch;

function mockVerify(body: Record<string, unknown>, status = 200) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  delete process.env["TURNSTILE_SECRET_KEY"];
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env["TURNSTILE_SECRET_KEY"];
});

describe("captcha verification", () => {
  it("is inert when no secret is configured, so forms keep working", async () => {
    expect(isCaptchaEnabled()).toBe(false);
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    await expect(verifyCaptcha(null)).resolves.toEqual({ ok: true });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a submission with no token once configured", async () => {
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    expect(isCaptchaEnabled()).toBe(true);
    await expect(verifyCaptcha("")).resolves.toEqual({ ok: false, reason: "missing" });
  });

  it("accepts a token the verifier confirms", async () => {
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    mockVerify({ success: true });
    await expect(verifyCaptcha("tok", "1.2.3.4")).resolves.toEqual({ ok: true });
  });

  it("rejects a token the verifier refuses", async () => {
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    mockVerify({ success: false, "error-codes": ["invalid-input-response"] });
    await expect(verifyCaptcha("tok")).resolves.toEqual({
      ok: false,
      reason: "invalid-input-response",
    });
  });

  it("does not block customers when our own key is misconfigured", async () => {
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    mockVerify({ success: false, "error-codes": ["invalid-input-secret"] });
    await expect(verifyCaptcha("tok")).resolves.toEqual({ ok: true });
  });

  it("does not block customers when the verifier is unreachable", async () => {
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(verifyCaptcha("tok")).resolves.toEqual({ ok: true });
  });

  it("assertCaptcha throws a customer-friendly error and sets HTTP 400", async () => {
    process.env["TURNSTILE_SECRET_KEY"] = "secret";
    mockVerify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    const setStatus = vi.fn();
    await expect(assertCaptcha("tok", "1.2.3.4", setStatus)).rejects.toThrow(/couldn't confirm you're human/i);
    expect(setStatus).toHaveBeenCalledWith(400);
  });

  it("assertCaptcha is a no-op when captcha is not configured", async () => {
    await expect(assertCaptcha(null)).resolves.toBeUndefined();
  });
});
