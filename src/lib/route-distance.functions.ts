import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  validatePlaceIds,
  rateLimitHit,
  cacheGet,
  cacheSet,
  RATE_LIMIT_PER_MINUTE,
} from "./route-distance.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Place IDs are ASCII, contain no whitespace or control chars.
const placeIdSchema = z
  .string()
  .trim()
  .min(1, "Please select a location from the suggestions.")
  .max(300, "Invalid location identifier.")
  .refine((v) => !/[\s\x00-\x1f\x7f]/.test(v), "Invalid location identifier.");

const input = z.object({
  pickupPlaceId: placeIdSchema,
  destinationPlaceId: placeIdSchema,
});

export type RouteDistanceResult = {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
};

export const calculateRouteDistance = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof input>) => {
    const parsed = input.parse(data);
    validatePlaceIds(parsed.pickupPlaceId, parsed.destinationPlaceId);
    return parsed;
  })
  .handler(async ({ data }): Promise<RouteDistanceResult> => {
    // Rate limit by IP (best-effort; in-memory per worker instance).
    let ip = "unknown";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    } catch {
      /* not in request context (e.g. tests) */
    }
    if (!rateLimitHit(ip)) {
      try {
        setResponseStatus(429);
      } catch {
        /* ignore outside request */
      }
      throw new Error("You've made too many requests. Please wait a moment and try again.");
    }

    // Cache
    const cacheKey = `${data.pickupPlaceId}|${data.destinationPlaceId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !lovableKey) {
      throw new Error("Distance calculation is temporarily unavailable. Please try again.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

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
          origin: { placeId: data.pickupPlaceId },
          destination: { placeId: data.destinationPlaceId },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          computeAlternativeRoutes: false,
          languageCode: "en-GB",
          units: "IMPERIAL",
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === "AbortError") {
        throw new Error("Distance calculation timed out. Please try again.");
      }
      throw new Error("Distance calculation is temporarily unavailable. Please try again.");
    }
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Routes API failed [${res.status}]: ${body}`);
      throw new Error("Distance calculation is temporarily unavailable. Please try again.");
    }

    const json = (await res.json()) as {
      routes?: Array<{ distanceMeters?: number; duration?: string }>;
    };
    const route = json.routes?.[0];
    if (!route || typeof route.distanceMeters !== "number") {
      throw new Error("We could not find a driving route between these locations.");
    }

    const distanceMeters = route.distanceMeters;
    const distanceMiles = Math.round((distanceMeters / 1609.344) * 100) / 100;
    const durationSeconds = route.duration
      ? parseInt(String(route.duration).replace(/[^\d]/g, ""), 10) || 0
      : 0;

    const result: RouteDistanceResult = { distanceMeters, distanceMiles, durationSeconds };
    cacheSet(cacheKey, result);
    return result;
  });

export { RATE_LIMIT_PER_MINUTE };
