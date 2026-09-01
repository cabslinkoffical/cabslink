/**
 * Phase SEO-F: Related-entity discovery for internal linking.
 * Returns nearby airports/cities and popular routes for a given SEO page.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SERVICE_REGISTRY } from "@/lib/seo/service-registry";

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

export type RelatedLink = { label: string; href: string; description?: string };
export type RelatedBundle = {
  nearby_airports: RelatedLink[];
  nearby_cities: RelatedLink[];
  popular_routes: RelatedLink[];
  services: RelatedLink[];
};

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const getRelatedSeoLinks = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) =>
    z
      .object({
        entityType: z.enum(["location", "airport", "service"]),
        entityId: z.string().uuid(),
        secondaryEntityType: z.string().nullable().optional(),
        secondaryEntityId: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<RelatedBundle> => {
    const supabase = serverPublicClient();
    const bundle: RelatedBundle = {
      nearby_airports: [],
      nearby_cities: [],
      popular_routes: [],
      services: [],
    };

    // Always: featured services
    const { data: services } = await supabase
      .from("seo_services")
      .select("name, slug, short_description")
      .eq("published", true)
      .order("display_priority", { ascending: true })
      .limit(6);
    // `/services/:slug` is not a real route — resolve each service to its
    // canonical top-level URL from the registry, and drop anything unknown so
    // we never emit a link that 404s.
    bundle.services = (services ?? []).flatMap((s: any) => {
      const rec = SERVICE_REGISTRY.find(
        (r) => r.slug === s.slug || r.id === s.slug || r.aliases.includes(String(s.slug ?? "").toLowerCase()),
      );
      if (!rec) return [];
      return [{
        label: s.name ?? rec.name,
        href: rec.url,
        description: s.short_description ?? undefined,
      }];
    });

    let center: { lat: number; lng: number } | null = null;
    let selfId: string = data.entityId;

    if (data.entityType === "location") {
      const { data: loc } = await supabase
        .from("seo_locations")
        .select("latitude, longitude")
        .eq("id", data.entityId)
        .maybeSingle();
      if (loc?.latitude != null && loc?.longitude != null) {
        center = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
      }
    } else if (data.entityType === "airport") {
      const { data: ap } = await supabase
        .from("seo_airports")
        .select("latitude, longitude")
        .eq("id", data.entityId)
        .maybeSingle();
      if (ap?.latitude != null && ap?.longitude != null) {
        center = { lat: Number(ap.latitude), lng: Number(ap.longitude) };
      }
    }

    if (center) {
      const { data: airports } = await supabase
        .from("seo_airports")
        .select("id, name, slug, iata_code, latitude, longitude")
        .eq("published", true);
      const scored = (airports ?? [])
        .filter((a: any) => a.id !== selfId && a.latitude != null && a.longitude != null && a.iata_code)
        .map((a: any) => ({
          a,
          d: haversineMiles(center!, { lat: Number(a.latitude), lng: Number(a.longitude) }),
        }))
        .sort((x, y) => x.d - y.d)
        .slice(0, 4);
      bundle.nearby_airports = scored.map(({ a, d }) => ({
        label: `${a.name} (${String(a.iata_code).toUpperCase()})`,
        href: `/airports/${String(a.slug).toLowerCase()}`,
        description: `${d.toFixed(0)} mi away`,
      }));

      const { data: locs } = await supabase
        .from("seo_locations")
        .select("id, name, slug, latitude, longitude")
        .eq("published", true);
      const nearCities = (locs ?? [])
        .filter((l: any) => l.id !== selfId && l.latitude != null && l.longitude != null)
        .map((l: any) => ({
          l,
          d: haversineMiles(center!, { lat: Number(l.latitude), lng: Number(l.longitude) }),
        }))
        .sort((x, y) => x.d - y.d)
        .slice(0, 6);
      bundle.nearby_cities = nearCities.map(({ l, d }) => ({
        label: l.name,
        href: `/areas/${l.slug}`,
        description: `${d.toFixed(0)} mi away`,
      }));
    }

    // Popular routes involving this entity (or globally featured for services)
    const routesQuery = supabase
      .from("seo_popular_routes")
      .select(
        "slug, origin_entity_type, origin_entity_id, destination_entity_type, destination_entity_id, starting_price_pence_cache, direct_distance_miles_cache",
      )
      .eq("published", true)
      .order("display_priority", { ascending: true })
      .limit(8);

    if (data.entityType === "location" || data.entityType === "airport") {
      routesQuery.or(
        `and(origin_entity_type.eq.${data.entityType},origin_entity_id.eq.${data.entityId}),and(destination_entity_type.eq.${data.entityType},destination_entity_id.eq.${data.entityId})`,
      );
    }
    const { data: routes } = await routesQuery;

    // Resolve endpoint labels
    const needLoc = new Set<string>();
    const needAir = new Set<string>();
    (routes ?? []).forEach((r: any) => {
      if (r.origin_entity_type === "location") needLoc.add(r.origin_entity_id);
      if (r.destination_entity_type === "location") needLoc.add(r.destination_entity_id);
      if (r.origin_entity_type === "airport") needAir.add(r.origin_entity_id);
      if (r.destination_entity_type === "airport") needAir.add(r.destination_entity_id);
    });

    const locMap = new Map<string, string>();
    if (needLoc.size) {
      const { data: rows } = await supabase
        .from("seo_locations")
        .select("id, name")
        .in("id", Array.from(needLoc));
      (rows ?? []).forEach((r: any) => locMap.set(r.id, r.name));
    }
    const airMap = new Map<string, string>();
    if (needAir.size) {
      const { data: rows } = await supabase
        .from("seo_airports")
        .select("id, name, iata_code")
        .in("id", Array.from(needAir));
      (rows ?? []).forEach((r: any) =>
        airMap.set(r.id, r.iata_code ? `${r.name} (${String(r.iata_code).toUpperCase()})` : r.name),
      );
    }

    const nameFor = (t: string, id: string) =>
      t === "airport" ? airMap.get(id) ?? "Airport" : locMap.get(id) ?? "Location";

    bundle.popular_routes = (routes ?? []).map((r: any) => {
      const from = nameFor(r.origin_entity_type, r.origin_entity_id);
      const to = nameFor(r.destination_entity_type, r.destination_entity_id);
      const priceGbp =
        r.starting_price_pence_cache != null
          ? `From £${(Number(r.starting_price_pence_cache) / 100).toFixed(0)}`
          : null;
      const dist = r.direct_distance_miles_cache != null ? `${Number(r.direct_distance_miles_cache).toFixed(0)} mi` : null;
      const desc = [priceGbp, dist].filter(Boolean).join(" • ") || undefined;
      return {
        label: `${from} → ${to}`,
        href: `/routes/${r.slug}`,
        description: desc,
      };
    });

    return bundle;
  });
