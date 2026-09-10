import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";
import { getGoogleMapsApiKey } from "@/lib/google-maps-env";

/**
 * Admin-only geometry helpers for the interactive map editor.
 *
 * These are VISUAL PREVIEW helpers only — they never compute price. The
 * authoritative pricing/availability path stays in `pricing.functions.ts`
 * (`computeVehicleQuote` / `resolveRulesForVehicle`). Distances returned here
 * are for display and reuse the same Routes API + cache as production.
 *
 * Google APIs used: Routes API (`routes/directions/v2:computeRoutes`) via the
 * connector gateway, and Places API (New) place details through
 * `place-coords.server` (cached in `public.place_coords`).
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const coordsInput = z.object({
  placeIds: z.array(placeIdSchema).min(1).max(10),
});

/** Resolve Place IDs to stable lat/lng (shared `place_coords` cache). */
export const adminResolvePlaceCoords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof coordsInput>) => coordsInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { resolveCoords } = await import("@/lib/place-coords.server");
    const map = await resolveCoords(context.supabase as any, data.placeIds);
    return {
      coords: data.placeIds.map((id) => {
        const c = map.get(id);
        return { placeId: id, lat: c?.lat ?? null, lng: c?.lng ?? null };
      }),
    };
  });

const routeInput = z.object({
  originPlaceId: placeIdSchema,
  destinationPlaceId: placeIdSchema,
});

export type AdminRouteGeometry = {
  encodedPolyline: string | null;
  distanceMiles: number;
  durationMinutes: number;
};

/** Route geometry (encoded polyline) + distance/duration for map preview. */
export const adminRouteGeometry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof routeInput>) => {
    const parsed = routeInput.parse(data);
    if (parsed.originPlaceId === parsed.destinationPlaceId) {
      throw new Error("Start and end locations must be different.");
    }
    return parsed;
  })
  .handler(async ({ data, context }): Promise<AdminRouteGeometry> => {
    await assertAdmin(context);

    const apiKey = getGoogleMapsApiKey();
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!lovableKey) throw new Error("Google Maps is not connected.");

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
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { placeId: data.originPlaceId },
          destination: { placeId: data.destinationPlaceId },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          computeAlternativeRoutes: false,
          languageCode: "en-GB",
          units: "IMPERIAL",
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") throw new Error("Route lookup timed out. Please try again.");
      throw new Error("Route lookup is unavailable right now.");
    }
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Routes API failed [${res.status}]: ${body.slice(0, 400)}`);
      if (res.status === 403) {
        throw new Error(
          "Google Maps request was denied (403). Check the server key's restrictions in Google Cloud Console.",
        );
      }
      throw new Error("Route lookup is unavailable right now.");
    }

    const json = (await res.json()) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
      }>;
    };
    const route = json.routes?.[0];
    if (!route || typeof route.distanceMeters !== "number") {
      throw new Error("No driving route found between those locations.");
    }
    const seconds = route.duration ? parseInt(String(route.duration).replace(/[^\d]/g, ""), 10) || 0 : 0;
    return {
      encodedPolyline: route.polyline?.encodedPolyline ?? null,
      distanceMiles: Math.round((route.distanceMeters / 1609.344) * 100) / 100,
      durationMinutes: Math.round(seconds / 60),
    };
  });
