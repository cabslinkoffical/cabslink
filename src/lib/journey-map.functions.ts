/**
 * Journey map data — driving polyline + leg endpoints for the booking page map.
 *
 * The Maps browser key is only authorised for Maps JavaScript + Places (New),
 * so the route geometry is fetched server-side through the connector gateway
 * (Routes API) and the browser only draws the returned polyline.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";
import { checkLimit } from "@/lib/rate-limit.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type JourneyMapPoint = { lat: number; lng: number };

export type JourneyMapData = {
  /** Encoded polyline of the whole journey, including any intermediate stops. */
  polyline: string;
  /** Ordered points: pickup, each stop, dropoff. */
  points: JourneyMapPoint[];
};

const input = z.object({
  pickupPlaceId: placeIdSchema,
  dropoffPlaceId: placeIdSchema,
  stopPlaceIds: z.array(placeIdSchema).max(8).optional().default([]),
});

export const getJourneyMap = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof input>) => {
    const parsed = input.parse(data);
    if (parsed.pickupPlaceId === parsed.dropoffPlaceId) {
      throw new Error("Pickup and destination cannot be the same location.");
    }
    return parsed;
  })
  .handler(async ({ data }): Promise<JourneyMapData> => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "journey-map", windowMs: 60_000, max: 30 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many map requests. Please wait a moment.");
    }

    const apiKey = process.env["GOOGLE_MAPS_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey || !lovableKey) throw new Error("Map service is not configured.");

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
          "X-Goog-FieldMask":
            "routes.polyline.encodedPolyline,routes.legs.startLocation.latLng,routes.legs.endLocation.latLng",
        },
        body: JSON.stringify({
          origin: { placeId: data.pickupPlaceId },
          destination: { placeId: data.dropoffPlaceId },
          ...(data.stopPlaceIds.length
            ? { intermediates: data.stopPlaceIds.map((id) => ({ placeId: id })) }
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
      throw new Error((err as Error).name === "AbortError"
        ? "Map is taking too long to load. Please try again."
        : "Map is temporarily unavailable.");
    }
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Journey map Routes API failed [${res.status}]: ${body.slice(0, 400)}`);
      throw new Error("Map is temporarily unavailable.");
    }

    const json = (await res.json()) as {
      routes?: Array<{
        polyline?: { encodedPolyline?: string };
        legs?: Array<{
          startLocation?: { latLng?: { latitude?: number; longitude?: number } };
          endLocation?: { latLng?: { latitude?: number; longitude?: number } };
        }>;
      }>;
    };
    const route = json.routes?.[0];
    const polyline = route?.polyline?.encodedPolyline ?? "";
    if (!polyline) throw new Error("We could not map a driving route between these locations.");

    const points: JourneyMapPoint[] = [];
    const push = (p?: { latitude?: number; longitude?: number }) => {
      if (typeof p?.latitude === "number" && typeof p?.longitude === "number") {
        points.push({ lat: p.latitude, lng: p.longitude });
      }
    };
    (route?.legs ?? []).forEach((leg, i) => {
      if (i === 0) push(leg.startLocation?.latLng);
      push(leg.endLocation?.latLng);
    });

    return { polyline, points };
  });
