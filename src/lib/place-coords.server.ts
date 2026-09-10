/**
 * Server-only Place-ID → lat/lng resolver, cached in `public.place_coords`.
 *
 * Used by the POI corridor matcher to find famous points that lie near the
 * straight line between a pickup and dropoff, without geocoding on every
 * quote. Reads pass through the anon-readable table; writes use the service
 * role via supabaseAdmin.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

import { getGoogleMapsApiKey } from "@/lib/google-maps-env";

export type Coord = { lat: number; lng: number };

async function fetchPlaceLatLng(placeId: string): Promise<Coord | null> {
  const apiKey = getGoogleMapsApiKey();
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(
      `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}?languageCode=en-GB&regionCode=GB`,
      {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apiKey,
          "X-Goog-FieldMask": "location",
        },
      },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { location?: { latitude?: number; longitude?: number } };
    const lat = json.location?.latitude;
    const lng = json.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { lat, lng };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

type MinimalClient = {
  from: (table: string) => {
    select: (cols: string) => {
      in: (col: string, ids: string[]) => Promise<{ data: Array<{ place_id: string; lat: number; lng: number }> | null; error: unknown }>;
    };
  };
};

/**
 * Resolve one or more Place IDs to lat/lng, using the shared cache table.
 * Missing rows are fetched from Google and written back through supabaseAdmin.
 */
export async function resolveCoords(
  client: MinimalClient,
  placeIds: string[],
): Promise<Map<string, Coord>> {
  const out = new Map<string, Coord>();
  const unique = Array.from(new Set(placeIds.filter((s) => typeof s === "string" && s.length > 0)));
  if (unique.length === 0) return out;

  // 1. Read from cache
  const { data: cached } = await client.from("place_coords").select("place_id, lat, lng").in("place_id", unique);
  for (const row of cached ?? []) {
    out.set(row.place_id, { lat: Number(row.lat), lng: Number(row.lng) });
  }

  const missing = unique.filter((id) => !out.has(id));
  if (missing.length === 0) return out;

  // 2. Geocode missing IDs (sequential to keep concurrency low)
  const fresh: Array<{ place_id: string; lat: number; lng: number }> = [];
  for (const id of missing) {
    const coord = await fetchPlaceLatLng(id);
    if (coord) {
      out.set(id, coord);
      fresh.push({ place_id: id, lat: coord.lat, lng: coord.lng });
    }
  }

  // 3. Persist fresh geocodes via service role (bypasses RLS)
  if (fresh.length > 0) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("place_coords").upsert(fresh, { onConflict: "place_id" });
    } catch (err) {
      // Cache write failures are non-fatal — the values are still returned.
      console.warn("place_coords upsert failed:", (err as Error).message);
    }
  }

  return out;
}
