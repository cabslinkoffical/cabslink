/**
 * POI listing — curated-first. Matches an active scenic route template on
 * exact origin/destination Place-ID pair (bidirectional flag respected)
 * and returns the curated POIs ranked by admin priority, scenic score,
 * then minutes. If no template matches, returns an empty list — Google
 * Search Along Route is intentionally not called here (cost control;
 * gated by site_settings.poi_discovery_enabled and wired in a later phase).
 *
 * Pure DTO output; no service-role usage; safe under public anon RLS.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { placeIdSchema } from "@/lib/place-id";

const inputSchema = z.object({
  pickup_place_id: placeIdSchema,
  destination_place_id: placeIdSchema,
});

export type RouteTemplateSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  origin_place_id: string;
  destination_place_id: string;
  bidirectional: boolean;
  default_order_locked: boolean;
  optimisation_allowed: boolean;
  service_type: string;
  tour_fee_pence: number;
  seasonal_note: string | null;
};

export type PoiSuggestion = {
  id: string;
  slug: string;
  place_id: string;
  name: string;
  category: string;
  short_description: string;
  address_label: string;
  image_url: string | null;
  scenic_score: number;
  admin_priority: number;
  featured: boolean;
  recommended: boolean;
  recommended_visit_minutes: number;
  minimum_visit_minutes: number;
  maximum_visit_minutes: number;
  stop_fee_pence: number;
  parking_fee_pence: number;
  stop_order: number;
  default_selected: boolean;
};

export type ListPoisForRouteResult = {
  template: RouteTemplateSummary | null;
  pois: PoiSuggestion[];
};

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

export async function findMatchingTemplate(
  client: ReturnType<typeof serverPublicClient>,
  pickupPid: string,
  dropoffPid: string,
): Promise<any | null> {
  const { data, error } = await client
    .from("scenic_route_templates")
    .select("*")
    .eq("active", true)
    .or(
      `and(origin_place_id.eq.${pickupPid},destination_place_id.eq.${dropoffPid}),` +
        `and(origin_place_id.eq.${dropoffPid},destination_place_id.eq.${pickupPid},bidirectional.eq.true)`,
    )
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function loadTemplatePois(
  client: ReturnType<typeof serverPublicClient>,
  templateId: string,
): Promise<PoiSuggestion[]> {
  const { data, error } = await client
    .from("scenic_route_template_pois")
    .select(
      "id, stop_order, default_selected, recommended, recommended_visit_minutes, points_of_interest(*)",
    )
    .eq("route_template_id", templateId)
    .order("stop_order", { ascending: true });
  if (error || !data) return [];

  const out: PoiSuggestion[] = [];
  for (const row of data as any[]) {
    const poi = row.points_of_interest;
    if (!poi || poi.active !== true) continue;
    out.push({
      id: poi.id,
      slug: poi.slug,
      place_id: poi.place_id,
      name: poi.name,
      category: poi.category,
      short_description: poi.short_description ?? "",
      address_label: poi.address_label ?? "",
      image_url: poi.image_url ?? null,
      scenic_score: Number(poi.scenic_score ?? 0),
      admin_priority: Number(poi.admin_priority ?? 0),
      featured: !!poi.featured,
      recommended: !!row.recommended,
      recommended_visit_minutes: Number(
        row.recommended_visit_minutes ?? poi.recommended_visit_minutes ?? 30,
      ),
      minimum_visit_minutes: Number(poi.minimum_visit_minutes ?? 15),
      maximum_visit_minutes: Number(poi.maximum_visit_minutes ?? 120),
      stop_fee_pence: Number(poi.stop_fee_pence ?? 0),
      parking_fee_pence: Number(poi.parking_fee_pence ?? 0),
      stop_order: Number(row.stop_order ?? 0),
      default_selected: !!row.default_selected,
    });
  }
  return out;
}

function toTemplateSummary(row: any): RouteTemplateSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    origin_place_id: row.origin_place_id,
    destination_place_id: row.destination_place_id,
    bidirectional: !!row.bidirectional,
    default_order_locked: !!row.default_order_locked,
    optimisation_allowed: !!row.optimisation_allowed,
    service_type: row.service_type ?? "sightseeing_transfer",
    tour_fee_pence: Number(row.tour_fee_pence ?? 0),
    seasonal_note: row.seasonal_note ?? null,
  };
}

// ---------------------------------------------------------------
// Corridor matcher — configurable fallback when no curated template
// matches the pickup/destination pair.
// ---------------------------------------------------------------
type CorridorSettings = {
  enabled: boolean;
  radius_miles: number;
  max_pois: number;
};

async function loadCorridorSettings(
  client: ReturnType<typeof serverPublicClient>,
): Promise<CorridorSettings> {
  const { data } = await client
    .from("site_settings_public" as any)
    .select("poi_corridor_enabled, poi_corridor_radius_miles, poi_corridor_max_pois")
    .eq("id", 1)
    .maybeSingle();
  return {
    enabled: !!(data as any)?.poi_corridor_enabled,
    radius_miles: Number((data as any)?.poi_corridor_radius_miles ?? 15),
    max_pois: Number((data as any)?.poi_corridor_max_pois ?? 8),
  };
}

/** Perpendicular great-circle distance (miles) from point P to segment A→B. */
function distanceToRouteMiles(p: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  // Convert to a local equirectangular projection centered on A.
  const project = (q: { lat: number; lng: number }) => {
    const x = toRad(q.lng - a.lng) * Math.cos(toRad((q.lat + a.lat) / 2));
    const y = toRad(q.lat - a.lat);
    return { x: x * R, y: y * R };
  };
  const ax = { x: 0, y: 0 };
  const bx = project(b);
  const px = project(p);
  const dx = bx.x - ax.x;
  const dy = bx.y - ax.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px.x, px.y);
  let t = (px.x * dx + px.y * dy) / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const cx = t * dx;
  const cy = t * dy;
  return Math.hypot(px.x - cx, px.y - cy);
}

async function corridorPois(
  client: ReturnType<typeof serverPublicClient>,
  pickupPid: string,
  destPid: string,
  settings: CorridorSettings,
): Promise<PoiSuggestion[]> {
  const { resolveCoords } = await import("@/lib/place-coords.server");
  const coords = await resolveCoords(client as any, [pickupPid, destPid]);
  const pickup = coords.get(pickupPid);
  const dest = coords.get(destPid);
  if (!pickup || !dest) return [];

  const { data: rows } = await client
    .from("points_of_interest")
    .select("*")
    .eq("active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const suggestions: Array<PoiSuggestion & { _detour: number }> = [];
  for (const poi of (rows ?? []) as any[]) {
    const lat = Number(poi.latitude);
    const lng = Number(poi.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const detour = distanceToRouteMiles({ lat, lng }, pickup, dest);
    if (detour > settings.radius_miles) continue;
    suggestions.push({
      id: poi.id,
      slug: poi.slug,
      place_id: poi.place_id,
      name: poi.name,
      category: poi.category,
      short_description: poi.short_description ?? "",
      address_label: poi.address_label ?? "",
      image_url: poi.image_url ?? null,
      scenic_score: Number(poi.scenic_score ?? 0),
      admin_priority: Number(poi.admin_priority ?? 0),
      featured: !!poi.featured,
      recommended: false,
      recommended_visit_minutes: Number(poi.recommended_visit_minutes ?? 30),
      minimum_visit_minutes: Number(poi.minimum_visit_minutes ?? 15),
      maximum_visit_minutes: Number(poi.maximum_visit_minutes ?? 120),
      stop_fee_pence: Number(poi.stop_fee_pence ?? 0),
      parking_fee_pence: Number(poi.parking_fee_pence ?? 0),
      stop_order: 0,
      default_selected: false,
      _detour: detour,
    });
  }

  suggestions.sort((a, b) => {
    // Featured/admin priority first, then closest to route, then scenic score.
    if (b.admin_priority !== a.admin_priority) return b.admin_priority - a.admin_priority;
    if (a._detour !== b._detour) return a._detour - b._detour;
    return b.scenic_score - a.scenic_score;
  });

  return suggestions.slice(0, Math.max(0, settings.max_pois)).map(({ _detour, ...rest }) => rest);
}

function synthesizedCorridorTemplate(
  pickupPid: string,
  destPid: string,
  radiusMiles: number,
): RouteTemplateSummary {
  return {
    id: `corridor:${pickupPid}:${destPid}`,
    name: "Famous points along your route",
    slug: "corridor-auto",
    description: `Popular stops within ${radiusMiles.toFixed(0)} miles of your direct route. Tick any to add them as scenic stops.`,
    origin_place_id: pickupPid,
    destination_place_id: destPid,
    bidirectional: true,
    default_order_locked: false,
    optimisation_allowed: true,
    service_type: "sightseeing_transfer",
    tour_fee_pence: 0,
    seasonal_note: null,
  };
}

export const listPoisForRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ListPoisForRouteResult> => {
    const client = serverPublicClient();
    const template = await findMatchingTemplate(
      client,
      data.pickup_place_id,
      data.destination_place_id,
    );
    if (template) {
      const pois = await loadTemplatePois(client, template.id);
      pois.sort((a, b) => {
        if (b.admin_priority !== a.admin_priority) return b.admin_priority - a.admin_priority;
        if (b.scenic_score !== a.scenic_score) return b.scenic_score - a.scenic_score;
        return a.stop_order - b.stop_order;
      });
      return { template: toTemplateSummary(template), pois };
    }

    // No curated template — fall back to admin-configured corridor matcher.
    const settings = await loadCorridorSettings(client);
    if (!settings.enabled || settings.max_pois === 0 || settings.radius_miles <= 0) {
      return { template: null, pois: [] };
    }

    const pois = await corridorPois(client, data.pickup_place_id, data.destination_place_id, settings);
    if (pois.length === 0) return { template: null, pois: [] };
    return {
      template: synthesizedCorridorTemplate(
        data.pickup_place_id,
        data.destination_place_id,
        settings.radius_miles,
      ),
      pois,
    };
  });
