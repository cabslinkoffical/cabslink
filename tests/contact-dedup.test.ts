import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/client-ip.server", () => ({ getClientIp: async () => "1.1.1.1" }));
vi.mock("@tanstack/react-start/server", () => ({ setResponseStatus: () => {} }));
vi.mock("@/lib/rate-limit.server", () => ({ checkLimit: () => true }));
vi.mock("@/lib/db-rate-limit.server", () => ({ hitRateLimit: async () => true, LIMITS: { contact: {} } }));
vi.mock("@/lib/captcha.server", () => ({ assertCaptcha: async () => {} }));

const { persistOnce, recentHashes } = await import("@/lib/contact.functions");

describe("contact duplicate suppression (W02)", () => {
  beforeEach(() => recentHashes.clear());

  it("retries persistence after an initial insert failure", async () => {
    const persist = vi.fn()
      .mockRejectedValueOnce(new Error("Could not send. Please try again."))
      .mockResolvedValueOnce(undefined);
    await expect(persistOnce("k", persist)).rejects.toThrow("Could not send");
    await expect(persistOnce("k", persist)).resolves.toBe("saved");
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("suppresses an identical message once it has been saved", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    await persistOnce("k", persist);
    await expect(persistOnce("k", persist)).resolves.toBe("duplicate");
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("concurrent identical submissions create only one message", async () => {
    let release!: () => void;
    const persist = vi.fn(() => new Promise<void>((r) => { release = r; }));
    const a = persistOnce("k", persist);
    const b = persistOnce("k", persist);
    await Promise.resolve();
    release();
    expect(await a).toBe("saved");
    expect(await b).toBe("duplicate");
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("a concurrent waiter retries itself when the in-flight insert fails", async () => {
    let fail!: () => void;
    const persist = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((_, rej) => { fail = () => rej(new Error("x")); }))
      .mockResolvedValueOnce(undefined);
    const a = persistOnce("k", persist);
    const b = persistOnce("k", persist);
    await Promise.resolve();
    fail();
    await expect(a).rejects.toThrow("x");
    expect(await b).toBe("saved");
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("saved entries expire after five minutes", async () => {
    let t = 0;
    const persist = vi.fn().mockResolvedValue(undefined);
    await persistOnce("k", persist, () => t);
    t = 5 * 60_000 + 1;
    await expect(persistOnce("k", persist, () => t)).resolves.toBe("saved");
  });
});
