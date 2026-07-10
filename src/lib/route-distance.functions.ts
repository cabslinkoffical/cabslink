import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const input = z.object({
  pickupPlaceId: z.string().trim().min(1).max(300),
  destinationPlaceId: z.string().trim().min(1).max(300),
});

export type RouteDistanceResult = {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
};

/**
 * Compute driving distance & duration between two Google Place IDs using
 * the Routes API (computeRoutes) via the Lovable Google Maps connector gateway.
 * Server-only: the connector API key never reaches the browser.
 */
export const calculateRouteDistance = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof input>) => input.parse(data))
  .handler(async ({ data }): Promise<RouteDistanceResult> => {
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
    // duration is a protobuf duration string like "3120s"
    const durationSeconds = route.duration ? parseInt(String(route.duration).replace(/[^\d]/g, ""), 10) || 0 : 0;

    return { distanceMeters, distanceMiles, durationSeconds };
  });
