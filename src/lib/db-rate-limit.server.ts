/**
 * Postgres-backed fixed-window rate limiter (server-only).
 *
 * Uses the service-role-only `rate_limit_hit` RPC, which atomically
 * increments (or resets) the counter for a key in one statement, so the
 * limit holds across every Worker isolate. A daily cron job removes stale
 * rows. If the database is unreachable we fall back to the per-isolate
 * in-memory limiter rather than letting traffic through unchecked.
 */
import { checkLimit } from "@/lib/rate-limit.server";

export type RateLimitRule = { name: string; max: number; windowSeconds: number };

export type RateLimitRpc = (args: {
  _key: string;
  _max: number;
  _window_seconds: number;
}) => Promise<{ data: unknown; error: unknown }>;

async function defaultRpc(): Promise<RateLimitRpc> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (args) => (supabaseAdmin as any).rpc("rate_limit_hit", args) as any;
}

/** True when the call is allowed; false once the limit is exceeded. */
export async function hitRateLimit(
  rule: RateLimitRule,
  key: string,
  rpc?: RateLimitRpc,
): Promise<boolean> {
  const fullKey = `${rule.name}:${key || "unknown"}`;
  try {
    const call = rpc ?? (await defaultRpc());
    const { data, error } = await call({ _key: fullKey, _max: rule.max, _window_seconds: rule.windowSeconds });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof (row as any).allowed !== "boolean") throw new Error("bad rate limit response");
    return (row as any).allowed;
  } catch (err) {
    console.error("rate limit rpc failed; using in-memory fallback", err);
    return checkLimit({ name: rule.name, windowMs: rule.windowSeconds * 1000, max: rule.max }, key).ok;
  }
}

/** Throws a 429 with the given message when the limit is exceeded. */
export async function enforceRateLimit(
  rule: RateLimitRule,
  key: string,
  message = "Too many attempts. Please wait a few minutes and try again.",
): Promise<void> {
  if (await hitRateLimit(rule, key)) return;
  try {
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    setResponseStatus(429);
  } catch { /* not in a request */ }
  throw new Error(message);
}

/** Shared limits for public endpoints. */
export const LIMITS = {
  createBooking: { name: "createBooking", max: 10, windowSeconds: 600 },
  tourBooking: { name: "tour-booking", max: 6, windowSeconds: 600 },
  bookingLookup: { name: "manageBookingLookup", max: 15, windowSeconds: 600 },
  trackLookup: { name: "bookingTrackLookup", max: 10, windowSeconds: 60 },
  tourPaymentAmount: { name: "tourPaymentAmount", max: 15, windowSeconds: 600 },
  cancel: { name: "manageBookingCancel", max: 5, windowSeconds: 600 },
  amendQuote: { name: "amendQuote", max: 25, windowSeconds: 600 },
  amendSubmit: { name: "amendSubmit", max: 10, windowSeconds: 600 },
  checkout: { name: "checkout", max: 20, windowSeconds: 600 },
  confirmPayment: { name: "confirmPayment", max: 30, windowSeconds: 600 },
} satisfies Record<string, RateLimitRule>;
