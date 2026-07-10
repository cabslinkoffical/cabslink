/**
 * Shared sliding-window rate limiter.
 *
 * NOTE: All buckets live in memory scoped to a single Worker isolate.
 * Cloudflare may run multiple isolates concurrently, and each resets on
 * cold start, so the effective per-IP limit is an upper bound per isolate
 * rather than a global guarantee. This is defense-in-depth for current
 * traffic. Migrate to Cloudflare KV, Durable Objects, or Upstash Redis if
 * production load requires cross-isolate consistency.
 */
type Bucket = Map<string, number[]>;
const buckets = new Map<string, Bucket>();

export type LimitConfig = { name: string; windowMs: number; max: number };

export function checkLimit(
  cfg: LimitConfig,
  key: string,
  now: number = Date.now(),
): { ok: boolean; remaining: number } {
  let bucket = buckets.get(cfg.name);
  if (!bucket) {
    bucket = new Map();
    buckets.set(cfg.name, bucket);
  }
  const cutoff = now - cfg.windowMs;
  const arr = (bucket.get(key) ?? []).filter((t) => t > cutoff);
  if (arr.length >= cfg.max) {
    bucket.set(key, arr);
    return { ok: false, remaining: 0 };
  }
  arr.push(now);
  bucket.set(key, arr);
  return { ok: true, remaining: cfg.max - arr.length };
}

export function _resetAllLimits() {
  buckets.clear();
}

export function _resetLimit(name: string) {
  buckets.delete(name);
}
