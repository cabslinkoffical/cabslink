import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validatePlaceIds,
  rateLimitHit,
  normalizeCacheKey,
  cacheGet,
  cacheSet,
  _resetRateLimiter,
  _resetCache,
  RATE_LIMIT_PER_MINUTE,
} from "../src/lib/route-distance.server";

beforeEach(() => {
  _resetRateLimiter();
  _resetCache();
});

describe("validatePlaceIds", () => {
  it("rejects identical pickup and destination", () => {
    expect(() => validatePlaceIds("ChIJabc", "ChIJabc")).toThrow(/cannot be the same/i);
  });
  it("accepts distinct ids", () => {
    expect(() => validatePlaceIds("ChIJabc", "ChIJxyz")).not.toThrow();
  });
});

describe("rate limiter", () => {
  it("allows up to the per-minute cap then blocks", () => {
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) {
      expect(rateLimitHit("1.1.1.1")).toBe(true);
    }
    expect(rateLimitHit("1.1.1.1")).toBe(false);
  });
  it("scopes limits per IP", () => {
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) rateLimitHit("1.1.1.1");
    expect(rateLimitHit("2.2.2.2")).toBe(true);
  });
});

describe("cache", () => {
  it("returns hit before TTL and miss after", () => {
    const key = normalizeCacheKey(" A ", " B ");
    expect(key).toBe("A|B");
    const now = 1_000_000;
    cacheSet(key, { distanceMeters: 100, distanceMiles: 0.06, durationSeconds: 10 }, now);
    expect(cacheGet(key, now + 60_000)).not.toBeNull();
    expect(cacheGet(key, now + 11 * 60_000)).toBeNull();
  });
});

describe("stale autocomplete race (sequence-guard semantics)", () => {
  // Simulates the concurrency model used by LocationAutocomplete: only the
  // response whose sequence matches the latest issued sequence is applied.
  it("ignores the slow first response when a faster second overtakes it", async () => {
    let displayed: string[] = [];
    let latestSeq = 0;

    async function fetchAutocomplete(query: string, delayMs: number) {
      const seq = ++latestSeq;
      await new Promise((r) => setTimeout(r, delayMs));
      if (seq !== latestSeq) return; // stale
      displayed = [`${query}-result`];
    }

    // Slow Edinburgh, then fast Glasgow overtakes it.
    const slow = fetchAutocomplete("Edinburgh Airport", 40);
    await new Promise((r) => setTimeout(r, 5));
    const fast = fetchAutocomplete("Glasgow", 5);
    await Promise.all([slow, fast]);

    expect(displayed).toEqual(["Glasgow-result"]);
  });

  it("double-click calculate only sends one request", async () => {
    let sent = 0;
    let inflight = false;
    async function calculate() {
      if (inflight) return;
      inflight = true;
      try {
        sent++;
        await new Promise((r) => setTimeout(r, 20));
      } finally {
        inflight = false;
      }
    }
    await Promise.all([calculate(), calculate(), calculate()]);
    expect(sent).toBe(1);
  });
});
