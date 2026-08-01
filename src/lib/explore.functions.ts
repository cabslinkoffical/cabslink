/**
 * Explore — server functions powering the Locations Explorer hub.
 * Everything is public read-only, cached generously via TanStack Query.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  DESTINATION_TYPES,
  type Destination,
  type DestinationType,
} from "@/lib/destinations.functions";
import { queryOptions } from "@tanstack/react-query";

function sb() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const FIELDS =
  "id,type,slug,name,display_name,short_name,country,region,council,town,parent_id,lat,lng,place_id,keywords,synonyms,nearby_ids,popular_route_ids,related_service_ids,seo_tier,noindex,active,linked_page_id,meta,updated_at";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

export type RegionCard = {
  slug: string;
  name: string;
  count: number;
  popularTowns: string[];
  hasAirports: boolean;
};

export type CategoryCard = {
  type: DestinationType;
  label: string;
  hubHref: string;
  count: number;
};

export type ExploreOverview = {
  regions: RegionCard[];
  categories: CategoryCard[];
  popular: Destination[];
  popularRoutes: Destination[];
  totalLocations: number;
  letters: string[]; // available first letters
};

const CATEGORY_META: Record<DestinationType, { label: string; hubHref: string }> = {
  location:      { label: "Areas & Towns",   hubHref: "/areas" },
  region:        { label: "Regions",         hubHref: "/areas" },
  council:       { label: "Councils",        hubHref: "/areas" },
  // No `/routes` hub exists (no published route pages) — send browsers to /areas.
  route:         { label: "Popular Routes",  hubHref: "/areas" },
  airport:       { label: "Airports",        hubHref: "/airports" },
  station:       { label: "Train Stations",  hubHref: "/stations" },
  cruise_port:   { label: "Cruise Ports",    hubHref: "/cruise-ports" },
  university:    { label: "Universities",    hubHref: "/universities" },
  hospital:      { label: "Hospitals",       hubHref: "/hospitals" },
  corporate:     { label: "Corporate",       hubHref: "/corporate" },
  business_park: { label: "Business Parks",  hubHref: "/corporate" },
  attraction:    { label: "Attractions",     hubHref: "/attractions" },
  distillery:    { label: "Distilleries",    hubHref: "/distilleries" },
  service:       { label: "Services",        hubHref: "/services" },
  guide:         { label: "Travel Guides",   hubHref: "/guides" },
  city:          { label: "Cities",          hubHref: "/areas" },
  town:          { label: "Towns",           hubHref: "/areas" },
  village:       { label: "Villages",        hubHref: "/areas" },
};

export const getExploreOverview = createServerFn({ method: "GET" })
  .handler(async (): Promise<ExploreOverview> => {
    const c = sb();
    const { data: rows } = await c
      .from("destinations")
      .select("id,type,slug,name,display_name,region,town,seo_tier,active")
      .eq("active", true)
      .neq("seo_tier", 4)
      .limit(5000);
    const list = (rows ?? []) as Array<Pick<Destination, "id" | "type" | "slug" | "name" | "display_name" | "region" | "town" | "seo_tier">>;

    // Regions
    const byRegion = new Map<string, { count: number; towns: Map<string, number>; hasAirports: boolean }>();
    for (const r of list) {
      if (!r.region) continue;
      const bucket = byRegion.get(r.region) ?? { count: 0, towns: new Map(), hasAirports: false };
      bucket.count++;
      if (r.town) bucket.towns.set(r.town, (bucket.towns.get(r.town) ?? 0) + 1);
      if (r.type === "airport") bucket.hasAirports = true;
      byRegion.set(r.region, bucket);
    }
    const regions: RegionCard[] = [...byRegion.entries()]
      .map(([name, b]) => ({
        slug: slugify(name),
        name,
        count: b.count,
        hasAirports: b.hasAirports,
        popularTowns: [...b.towns.entries()].sort((a, z) => z[1] - a[1]).slice(0, 4).map(([t]) => t),
      }))
      .sort((a, z) => z.count - a.count);

    // Categories
    const byType = new Map<DestinationType, number>();
    for (const r of list) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
    const categories: CategoryCard[] = (DESTINATION_TYPES as readonly DestinationType[])
      .map((t) => ({ type: t, ...CATEGORY_META[t], count: byType.get(t) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, z) => z.count - a.count);

    // Popular
    const popular: Destination[] = [];
    const popularRoutes: Destination[] = [];
    const { data: pRows } = await c
      .from("destinations")
      .select(FIELDS)
      .eq("active", true)
      .in("seo_tier", [1, 2])
      .neq("type", "route")
      .order("seo_tier", { ascending: true })
      .order("name", { ascending: true })
      .limit(12);
    popular.push(...((pRows ?? []) as Destination[]));

    const { data: rRows } = await c
      .from("destinations")
      .select(FIELDS)
      .eq("active", true)
      .eq("type", "route")
      .in("seo_tier", [1, 2])
      .order("name", { ascending: true })
      .limit(12);
    popularRoutes.push(...((rRows ?? []) as Destination[]));

    // Letters
    const letters = new Set<string>();
    for (const r of list) {
      const ch = (r.display_name ?? r.name).trim()[0]?.toUpperCase();
      if (ch && /[A-Z]/.test(ch)) letters.add(ch);
    }

    return {
      regions,
      categories,
      popular,
      popularRoutes,
      totalLocations: list.length,
      letters: [...letters].sort(),
    };
  });

export type RegionHub = {
  name: string;
  slug: string;
  towns: Destination[];
  airports: Destination[];
  stations: Destination[];
  universities: Destination[];
  hospitals: Destination[];
  attractions: Destination[];
  routes: Destination[];
  services: Destination[];
  total: number;
};

export const getRegionHub = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }): Promise<RegionHub | null> => {
    const c = sb();
    // Find region name from slug
    const { data: sample } = await c
      .from("destinations")
      .select("region")
      .eq("active", true)
      .not("region", "is", null)
      .limit(2000);
    const rNames = new Set<string>();
    for (const r of (sample ?? []) as Array<{ region: string | null }>) if (r.region) rNames.add(r.region);
    const match = [...rNames].find((n) => slugify(n) === data.slug);
    if (!match) return null;

    const { data: rows } = await c
      .from("destinations")
      .select(FIELDS)
      .eq("active", true)
      .eq("region", match)
      .neq("seo_tier", 4)
      .order("seo_tier", { ascending: true })
      .order("name", { ascending: true })
      .limit(500);
    const all = (rows ?? []) as Destination[];
    const bucket = (t: DestinationType) => all.filter((d) => d.type === t).slice(0, 24);
    return {
      name: match,
      slug: data.slug,
      towns: [...bucket("location"), ...bucket("council")].slice(0, 30),
      airports: bucket("airport"),
      stations: bucket("station"),
      universities: bucket("university"),
      hospitals: bucket("hospital"),
      attractions: [...bucket("attraction"), ...bucket("distillery")].slice(0, 24),
      routes: bucket("route"),
      services: bucket("service"),
      total: all.length,
    };
  });

export const getAlphaBucket = createServerFn({ method: "GET" })
  .inputValidator((input: { letter: string }) =>
    z.object({ letter: z.string().regex(/^[a-z0-9]$/i) }).parse(input),
  )
  .handler(async ({ data }): Promise<Destination[]> => {
    const c = sb();
    const L = data.letter.toUpperCase();
    const { data: rows } = await c
      .from("destinations")
      .select(FIELDS)
      .eq("active", true)
      .neq("seo_tier", 4)
      .ilike("name", `${L}%`)
      .order("name", { ascending: true })
      .limit(500);
    return (rows ?? []) as Destination[];
  });

export const exploreOverviewQuery = () =>
  queryOptions({
    queryKey: ["explore", "overview"],
    queryFn: () => getExploreOverview(),
    staleTime: 60 * 60 * 1000,
  });

export const regionHubQuery = (slug: string) =>
  queryOptions({
    queryKey: ["explore", "region", slug],
    queryFn: () => getRegionHub({ data: { slug } }),
    staleTime: 30 * 60 * 1000,
  });

export const alphaBucketQuery = (letter: string) =>
  queryOptions({
    queryKey: ["explore", "alpha", letter.toUpperCase()],
    queryFn: () => getAlphaBucket({ data: { letter } }),
    staleTime: 30 * 60 * 1000,
  });

// ---------------------------------------------------------------------------
// Area SEO context — powers the authoritative /areas/$slug location page.
// Fetches the location + all typed nearby entities via destination_relationships
// (airports, stations, hospitals, universities, attractions, hotels, cruise ports).
// ---------------------------------------------------------------------------

export type AreaSeoContext = {
  destination: Destination;
  nearbyAreas: Destination[];
  airports: Destination[];
  stations: Destination[];
  universities: Destination[];
  hospitals: Destination[];
  attractions: Destination[];
  hotels: Destination[];
  cruisePorts: Destination[];
  popularRoutes: Destination[];
  services: Destination[];
};

const REL_TO_BUCKET: Record<string, keyof AreaSeoContext> = {
  nearby: "nearbyAreas",
  nearest_airport: "airports",
  nearest_station: "stations",
  nearest_hospital: "hospitals",
  nearest_university: "universities",
  related_attraction: "attractions",
  related_hotel: "hotels",
  popular_route: "popularRoutes",
  related_service: "services",
};

export const getAreaSeoContext = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }): Promise<AreaSeoContext | null> => {
    const c = sb();
    const { data: root } = await c
      .from("destinations")
      .select(FIELDS)
      .in("type", ["location", "city", "town", "village"])
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (!root) return null;
    const d = root as Destination;

    // 1) Relationships from this destination.
    const { data: rels } = await c
      .from("destination_relationships")
      .select("to_id, rel_type, rank")
      .eq("from_id", d.id)
      .order("rank", { ascending: true })
      .limit(300);

    const ids = new Set<string>();
    for (const r of (rels ?? []) as Array<{ to_id: string }>) ids.add(r.to_id);
    // Merge legacy id arrays stored on the row itself.
    for (const id of d.nearby_ids ?? []) ids.add(id);
    for (const id of d.popular_route_ids ?? []) ids.add(id);
    for (const id of d.related_service_ids ?? []) ids.add(id);

    // 2) Fetch all referenced destinations in one round-trip.
    let related: Destination[] = [];
    if (ids.size) {
      const { data: rows } = await c
        .from("destinations")
        .select(FIELDS)
        .in("id", [...ids])
        .eq("active", true)
        .neq("seo_tier", 4);
      related = (rows as Destination[]) ?? [];
    }
    const byId = new Map(related.map((r) => [r.id, r]));

    // 3) Bucket by rel_type; fall back to type-based bucketing for legacy arrays.
    const ctx: AreaSeoContext = {
      destination: d,
      nearbyAreas: [],
      airports: [],
      stations: [],
      universities: [],
      hospitals: [],
      attractions: [],
      hotels: [],
      cruisePorts: [],
      popularRoutes: [],
      services: [],
    };
    const seenIn: Record<string, Set<string>> = {};
    const pushBucket = (bucket: keyof AreaSeoContext, dest: Destination) => {
      if (bucket === "destination") return;
      const set = (seenIn[bucket] ??= new Set());
      if (set.has(dest.id)) return;
      set.add(dest.id);
      (ctx[bucket] as Destination[]).push(dest);
    };

    for (const r of (rels ?? []) as Array<{ to_id: string; rel_type: string }>) {
      const dest = byId.get(r.to_id);
      if (!dest) continue;
      const bucket = REL_TO_BUCKET[r.rel_type];
      if (bucket) pushBucket(bucket, dest);
    }

    // Legacy fallbacks — sort into buckets by destination type when relationships missing.
    for (const id of d.nearby_ids ?? []) {
      const dest = byId.get(id);
      if (!dest) continue;
      if (dest.type === "airport") pushBucket("airports", dest);
      else if (dest.type === "station") pushBucket("stations", dest);
      else if (dest.type === "university") pushBucket("universities", dest);
      else if (dest.type === "hospital") pushBucket("hospitals", dest);
      else if (dest.type === "cruise_port") pushBucket("cruisePorts", dest);
      else if (dest.type === "attraction" || dest.type === "distillery") pushBucket("attractions", dest);
      else if (dest.type === "location") pushBucket("nearbyAreas", dest);
    }
    for (const id of d.popular_route_ids ?? []) {
      const dest = byId.get(id);
      if (dest) pushBucket("popularRoutes", dest);
    }
    for (const id of d.related_service_ids ?? []) {
      const dest = byId.get(id);
      if (dest) pushBucket("services", dest);
    }

    // 4) If no airports came through relationships, surface region airports as a fallback.
    if (!ctx.airports.length && d.region) {
      const { data: rows } = await c
        .from("destinations")
        .select(FIELDS)
        .eq("type", "airport")
        .eq("active", true)
        .neq("seo_tier", 4)
        .eq("region", d.region)
        .limit(6);
      ctx.airports = (rows as Destination[]) ?? [];
    }

    // Cap buckets for render.
    const cap = <K extends keyof AreaSeoContext>(k: K, n: number) => {
      if (Array.isArray(ctx[k])) (ctx[k] as Destination[]) = (ctx[k] as Destination[]).slice(0, n);
    };
    cap("nearbyAreas", 12);
    cap("airports", 8);
    cap("stations", 8);
    cap("universities", 8);
    cap("hospitals", 8);
    cap("attractions", 12);
    cap("hotels", 8);
    cap("cruisePorts", 6);
    cap("popularRoutes", 12);
    cap("services", 8);

    return ctx;
  });

export const areaSeoContextQuery = (slug: string) =>
  queryOptions({
    queryKey: ["explore", "area", slug],
    queryFn: () => getAreaSeoContext({ data: { slug } }),
    staleTime: 30 * 60 * 1000,
  });

