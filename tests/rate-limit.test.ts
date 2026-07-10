import { describe, it, expect, beforeEach } from "vitest";
import { checkLimit, _resetAllLimits } from "@/lib/rate-limit.server";

beforeEach(() => _resetAllLimits());

describe("checkLimit sliding window", () => {
  it("allows up to max, then blocks with friendly outcome", () => {
    const cfg = { name: "t1", windowMs: 60_000, max: 3 };
    expect(checkLimit(cfg, "1.1.1.1").ok).toBe(true);
    expect(checkLimit(cfg, "1.1.1.1").ok).toBe(true);
    expect(checkLimit(cfg, "1.1.1.1").ok).toBe(true);
    expect(checkLimit(cfg, "1.1.1.1").ok).toBe(false);
  });
  it("scopes per key", () => {
    const cfg = { name: "t2", windowMs: 60_000, max: 1 };
    expect(checkLimit(cfg, "a").ok).toBe(true);
    expect(checkLimit(cfg, "b").ok).toBe(true);
    expect(checkLimit(cfg, "a").ok).toBe(false);
  });
  it("scopes per limiter name", () => {
    const a = { name: "book", windowMs: 60_000, max: 1 };
    const b = { name: "quote", windowMs: 60_000, max: 1 };
    expect(checkLimit(a, "ip").ok).toBe(true);
    expect(checkLimit(b, "ip").ok).toBe(true);
    expect(checkLimit(a, "ip").ok).toBe(false);
  });
});
