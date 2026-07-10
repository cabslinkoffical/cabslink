import type { RouteDistanceResult } from "./route-distance.functions";

// ---------- Place-ID validation ----------

export function validatePlaceIds(pickup: string, destination: string): void {
  if (pickup === destination) {
    throw new Error("Pickup and destination cannot be the same location.");
  }
}

// ---------- Rate limiter (sliding window, per-IP, in-memory) ----------
//
// NOTE: This limiter — and the cache below — live in memory scoped to a single
// Worker instance. Cloudflare may run multiple isolates concurrently, and each
// resets state on cold start, so the effective per-IP limit is an upper bound
// per isolate rather than a global guarantee. This is sufficient defense-in-
// depth for current traffic. If production load grows, migrate both stores to
// distributed storage (Cloudflare KV, Durable Objects, or Upstash Redis) so
// limits and cache entries are shared across isolates.

export const RATE_LIMIT_PER_MINUTE = 20;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function rateLimitHit(ip: string, now: number = Date.now()): boolean {
  const arr = hits.get(ip) ?? [];
  const cutoff = now - WINDOW_MS;
  const recent = arr.filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_PER_MINUTE) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

// Test helper
export function _resetRateLimiter() {
  hits.clear();
}

// ---------- Route cache (in-memory, per worker) ----------

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes; only successful results
type CacheEntry = { value: RouteDistanceResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function normalizeCacheKey(pickup: string, destination: string): string {
  return `${pickup.trim()}|${destination.trim()}`;
}

export function cacheGet(key: string, now: number = Date.now()): RouteDistanceResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key: string, value: RouteDistanceResult, now: number = Date.now()) {
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
}

export function _resetCache() {
  cache.clear();
}
