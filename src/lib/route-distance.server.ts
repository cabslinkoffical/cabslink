/**
 * Server-only Google Routes API helpers + in-memory cache / rate limiter.
 *
 * NOTE: The cache and rate limiter here live in memory scoped to a single
 * Worker isolate. Cloudflare may run multiple isolates concurrently, each
 * resetting on cold start, so per-IP limits and cached routes are an upper
 * bound per isolate rather than a global guarantee. This is sufficient
 * defense-in-depth for current traffic. Migrate both stores to distributed
 * storage (Cloudflare KV, Durable Objects, or Upstash Redis) if production
 * load requires cross-isolate consistency.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type RouteDistanceResult = {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
};

// ---------- Typed errors ----------
export class RouteTimeoutError extends Error {
  constructor() {
    super("Distance calculation timed out. Please try again.");
    this.name = "RouteTimeoutError";
  }
}
export class RouteUnavailableError extends Error {
  constructor(msg = "Distance calculation is temporarily unavailable. Please try again.") {
    super(msg);
    this.name = "RouteUnavailableError";
  }
}
export class RouteNotFoundError extends Error {
  constructor() {
    super("We could not find a driving route between these locations.");
    this.name = "RouteNotFoundError";
  }
}

// ---------- Place-ID validation ----------
export function validatePlaceIds(pickup: string, destination: string): void {
  if (pickup === destination) {
    throw new Error("Pickup and destination cannot be the same location.");
  }
}

// ---------- Rate limiter (kept for /distance callers + tests) ----------
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
export function _resetRateLimiter() {
  hits.clear();
}

// ---------- Success-only route cache ----------
const CACHE_TTL_MS = 10 * 60 * 1000;
type CacheEntry = { value: RouteDistanceResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function normalizeCacheKey(pickup: string, destination: string, waypoints: string[] = []): string {
  const wp = waypoints.length ? `|w:${waypoints.map((w) => w.trim()).join(",")}` : "";
  return `${pickup.trim()}|${destination.trim()}${wp}`;
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

// ---------- Core: compute real driving route via Google Routes API ----------
export type ComputeRouteInput = {
  originPlaceId: string;
  destinationPlaceId: string;
  waypointPlaceIds?: string[];
};

export async function computeRoute(input: ComputeRouteInput): Promise<RouteDistanceResult> {
  const { originPlaceId, destinationPlaceId, waypointPlaceIds = [] } = input;
  validatePlaceIds(originPlaceId, destinationPlaceId);

  const key = normalizeCacheKey(originPlaceId, destinationPlaceId, waypointPlaceIds);
  const cached = cacheGet(key);
  if (cached) return cached;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) throw new RouteUnavailableError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { placeId: originPlaceId },
        destination: { placeId: destinationPlaceId },
        ...(waypointPlaceIds.length
          ? { intermediates: waypointPlaceIds.map((id) => ({ placeId: id })) }
          : {}),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
        languageCode: "en-GB",
        units: "IMPERIAL",
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") throw new RouteTimeoutError();
    throw new RouteUnavailableError();
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Routes API failed [${res.status}]: ${body}`);
    throw new RouteUnavailableError();
  }

  const json = (await res.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string }>;
  };
  const route = json.routes?.[0];
  if (!route || typeof route.distanceMeters !== "number") throw new RouteNotFoundError();

  const distanceMeters = route.distanceMeters;
  const distanceMiles = Math.round((distanceMeters / 1609.344) * 100) / 100;
  const durationSeconds = route.duration
    ? parseInt(String(route.duration).replace(/[^\d]/g, ""), 10) || 0
    : 0;

  const result: RouteDistanceResult = { distanceMeters, distanceMiles, durationSeconds };
  cacheSet(key, result);
  return result;
}
