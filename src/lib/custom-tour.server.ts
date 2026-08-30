/**
 * Custom-tour builder — server-only implementation.
 *
 * Two jobs:
 *  1. Match a published tour to an arbitrary origin/destination Place-ID pair
 *     (respecting the template's `bidirectional` flag) so the builder can
 *     pre-fill a real itinerary the customer can then edit.
 *  2. Suggest curated points of interest the customer can add as stops, either
 *     by free-text search or ranked by proximity to their route corridor.
 *
 * Everything runs through the publishable (anon) client, so RLS is the access
 * boundary: only active POIs and published templates are ever returned.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getPublishedTourBySlugImpl, type PublicTourDetail } from "@/lib/tours.functions";

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type TourRouteMatch = {
  /** "exact" — same origin+destination. "reversed" — matched the bidirectional
   * template in the opposite direction. "none" — no published tour matches. */
  kind: "exact" | "reversed" | "none";
  tour: PublicTourDetail | null;
};

/** Endpoints within this straight-line distance count as the same place. */
const ENDPOINT_MATCH_MILES = 8;

type TemplateRow = {
  slug: string;
  origin_place_id: string;
  destination_place_id: string;
  bidirectional: boolean | null;
};

export async function matchTourByRouteImpl(
  pickupPlaceId: string,
  destinationPlaceId: string,
): Promise<TourRouteMatch> {
  const client = serverPublicClient();
  const { data, error } = await client
    .from("scenic_route_templates")
    .select("slug, origin_place_id, destination_place_id, bidirectional, featured, display_order")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .limit(300);
  if (error || !data || data.length === 0) return { kind: "none", tour: null };
  const rows = data as unknown as TemplateRow[];

  // 1. Exact Place-ID match (cheapest, most precise).
  let hit = rows.find(
    (r) => r.origin_place_id === pickupPlaceId && r.destination_place_id === destinationPlaceId,
  );
  let reversed = false;
  if (!hit) {
    hit = rows.find(
      (r) =>
        r.bidirectional === true &&
        r.origin_place_id === destinationPlaceId &&
        r.destination_place_id === pickupPlaceId,
    );
    reversed = !!hit;
  }

  // 2. Fallback: proximity match. Customers rarely pick the exact same Place ID
  //    the template was built with ("Edinburgh" vs "Edinburgh City Centre"), so
  //    treat endpoints within a few miles of each other as the same place.
  if (!hit) {
    const ids = new Set<string>([pickupPlaceId, destinationPlaceId]);
    for (const r of rows) {
      ids.add(r.origin_place_id);
      ids.add(r.destination_place_id);
    }
    const coords = await resolveCoords(client as never, Array.from(ids));
    const from = coords.get(pickupPlaceId);
    const to = coords.get(destinationPlaceId);
    if (from && to) {
      const near = (a: { lat: number; lng: number } | undefined, b: { lat: number; lng: number }) =>
        !!a && haversineMiles(a.lat, a.lng, b.lat, b.lng) <= ENDPOINT_MATCH_MILES;
      hit = rows.find(
        (r) => near(coords.get(r.origin_place_id), from) && near(coords.get(r.destination_place_id), to),
      );
      if (!hit) {
        hit = rows.find(
          (r) =>
            r.bidirectional === true &&
            near(coords.get(r.origin_place_id), to) &&
            near(coords.get(r.destination_place_id), from),
        );
        reversed = !!hit;
      }
    }
  }

  if (!hit) return { kind: "none", tour: null };
  const tour = await getPublishedTourBySlugImpl(hit.slug);
  if (!tour) return { kind: "none", tour: null };
  return { kind: reversed ? "reversed" : "exact", tour };
}

export type PoiOption = {
  id: string;
  slug: string;
  place_id: string;
  name: string;
  category: string | null;
  short_description: string | null;
  image_url: string | null;
  recommended_visit_minutes: number;
  minimum_visit_minutes: number;
  maximum_visit_minutes: number;
  stop_fee_pence: number;
  parking_fee_pence: number;
  featured: boolean;
  /** Straight-line miles from the direct pickup→dropoff line, when a corridor
   * was supplied. Null for free-text search results. */
  detour_miles: number | null;
};

const PUBLIC_POI_FIELDS =
  "id, slug, place_id, name, category, short_description, image_url, recommended_visit_minutes, minimum_visit_minutes, maximum_visit_minutes, stop_fee_pence, parking_fee_pence, featured, latitude, longitude";

function toOption(row: any, detourMiles: number | null): PoiOption {
  return {
    id: row.id,
    slug: row.slug,
    place_id: row.place_id,
    name: row.name,
    category: row.category ?? null,
    short_description: row.short_description ?? null,
    image_url: row.image_url ?? null,
    recommended_visit_minutes: Math.max(0, Number(row.recommended_visit_minutes ?? 30)),
    minimum_visit_minutes: Math.max(0, Number(row.minimum_visit_minutes ?? 0)),
    maximum_visit_minutes: Math.max(15, Number(row.maximum_visit_minutes ?? 240)),
    stop_fee_pence: Number(row.stop_fee_pence ?? 0),
    parking_fee_pence: Number(row.parking_fee_pence ?? 0),
    featured: !!row.featured,
    detour_miles: detourMiles,
  };
}

/** Free-text search over curated POIs (name / category / description). */
export async function searchPoiOptionsImpl(q: string, limit: number): Promise<PoiOption[]> {
  const client = serverPublicClient();
  const safe = q.replace(/[,()%]/g, " ").trim();
  if (!safe) return [];
  const { data, error } = await client
    .from("points_of_interest")
    .select(PUBLIC_POI_FIELDS)
    .eq("active", true)
    .or(`name.ilike.%${safe}%,category.ilike.%${safe}%,short_description.ilike.%${safe}%`)
    .order("featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map((r) => toOption(r, null));
}

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Perpendicular-ish distance from point P to the segment A→B, in miles. */
function distanceToCorridorMiles(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
) {
  // Local equirectangular projection is accurate enough at UK scale.
  const midLat = (aLat + bLat) / 2;
  const kx = 69.17 * Math.cos((midLat * Math.PI) / 180);
  const ky = 69.05;
  const ax = aLng * kx, ay = aLat * ky;
  const bx = bLng * kx, by = bLat * ky;
  const px = pLng * kx, py = pLat * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return haversineMiles(pLat, pLng, aLat, aLng);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}

async function coordsForPlaceIds(
  client: ReturnType<typeof serverPublicClient>,
  placeIds: string[],
) {
  const { resolveCoords } = await import("@/lib/place-coords.server");
  return resolveCoords(client as any, Array.from(new Set(placeIds.filter(Boolean))));
}


/**
 * POIs ranked by how little they detour the direct pickup→dropoff line.
 * Falls back to featured curated POIs when we cannot resolve coordinates for
 * the endpoints (e.g. brand-new Place-IDs not yet cached).
 */
export async function corridorPoiOptionsImpl(
  pickupPlaceId: string,
  destinationPlaceId: string,
  radiusMiles: number,
  limit: number,
): Promise<{ pois: PoiOption[]; corridor: boolean }> {
  const client = serverPublicClient();
  const { data, error } = await client
    .from("points_of_interest")
    .select(PUBLIC_POI_FIELDS)
    .eq("active", true)
    .limit(500);
  if (error || !data) return { pois: [], corridor: false };
  const rows = data as any[];

  const coords = await coordsForPlaceIds(client, [pickupPlaceId, destinationPlaceId]);
  const a = coords.get(pickupPlaceId);
  const b = coords.get(destinationPlaceId);
  if (!a || !b) {
    const fallback = rows
      .slice()
      .sort((x, y) => Number(!!y.featured) - Number(!!x.featured) || String(x.name).localeCompare(String(y.name)))
      .slice(0, limit)
      .map((r) => toOption(r, null));
    return { pois: fallback, corridor: false };
  }

  const scored: Array<{ row: any; detour: number }> = [];
  for (const r of rows) {
    const lat = r.latitude == null ? null : Number(r.latitude);
    const lng = r.longitude == null ? null : Number(r.longitude);
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const detour = distanceToCorridorMiles(lat, lng, a.lat, a.lng, b.lat, b.lng);
    if (detour <= radiusMiles) scored.push({ row: r, detour });
  }
  scored.sort((x, y) => {
    const f = Number(!!y.row.featured) - Number(!!x.row.featured);
    if (f !== 0) return f;
    return x.detour - y.detour;
  });
  return {
    pois: scored.slice(0, limit).map((s) => toOption(s.row, Math.round(s.detour * 10) / 10)),
    corridor: true,
  };
}
