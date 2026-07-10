import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";
import {
  computeRoute,
  rateLimitHit,
  RATE_LIMIT_PER_MINUTE,
  RouteTimeoutError,
  RouteNotFoundError,
  RouteUnavailableError,
  type RouteDistanceResult,
} from "@/lib/route-distance.server";

export type { RouteDistanceResult } from "@/lib/route-distance.server";

const input = z.object({
  pickupPlaceId: placeIdSchema,
  destinationPlaceId: placeIdSchema,
});

export const calculateRouteDistance = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof input>) => {
    const parsed = input.parse(data);
    if (parsed.pickupPlaceId === parsed.destinationPlaceId) {
      throw new Error("Pickup and destination cannot be the same location.");
    }
    return parsed;
  })
  .handler(async ({ data }): Promise<RouteDistanceResult> => {
    let ip = "unknown";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    } catch {
      /* not in request context (e.g. tests) */
    }
    if (!rateLimitHit(ip)) {
      try {
        setResponseStatus(429);
      } catch {}
      throw new Error("You've made too many requests. Please wait a moment and try again.");
    }
    try {
      return await computeRoute({
        originPlaceId: data.pickupPlaceId,
        destinationPlaceId: data.destinationPlaceId,
      });
    } catch (err) {
      if (err instanceof RouteTimeoutError) throw new Error(err.message);
      if (err instanceof RouteNotFoundError) throw new Error(err.message);
      if (err instanceof RouteUnavailableError) throw new Error(err.message);
      throw err;
    }
  });

export { RATE_LIMIT_PER_MINUTE };
