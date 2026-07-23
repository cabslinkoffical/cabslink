/**
 * Destinations — canonical entity layer.
 * Public read-only server functions (RLS gates tier 4 out for anon).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export const DESTINATION_TYPES = [
  "location", "route", "airport", "station", "cruise_port", "university",
  "hospital", "corporate", "attraction", "distillery", "business_park",
  "service", "guide", "region", "council",
  "city", "town", "village",
] as const;
export type DestinationType = (typeof DESTINATION_TYPES)[number];

export type Destination = {
  id: string;
  type: DestinationType;
  slug: string;
  name: string;
  display_name: string | null;
  short_name: string | null;
  country: string;
  region: string | null;
  council: string | null;
  town: string | null;
  parent_id: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  keywords: string[];
  synonyms: string[];
  nearby_ids: string[];
  popular_route_ids: string[];
  related_service_ids: string[];
  seo_tier: 1 | 2 | 3 | 4;
  noindex: boolean;
  active: boolean;
  linked_page_id: string | null;
  meta: { iata?: string; [k: string]: string | number | boolean | null | undefined };
  updated_at: string;
};

const FIELDS =
  "id,type,slug,name,display_name,short_name,country,region,council,town,parent_id,lat,lng,place_id,keywords,synonyms,nearby_ids,popular_route_ids,related_service_ids,seo_tier,noindex,active,linked_page_id,meta,updated_at";

/** URL for a destination based on type + slug. */
export function destinationHref(d: Pick<Destination, "type" | "slug">): string {
  const t = d.type;
  const seg =
    t === "airport" ? "airports" :
    t === "route" ? "routes" :
    t === "location" ? "areas" :
    t === "station" ? "stations" :
    t === "cruise_port" ? "cruise-ports" :
    t === "university" ? "universities" :
    t === "hospital" ? "hospitals" :
    t === "corporate" ? "corporate" :
    t === "attraction" ? "attractions" :
    t === "distillery" ? "distilleries" :
    t === "business_park" ? "corporate" :
    t === "service" ? "services" :
    t === "guide" ? "guides" :
    t === "region" ? "areas" :
    t === "council" ? "areas" :
    "areas";
  return `/${seg}/${d.slug}`;
}

/** Get a single destination by type + slug. Returns null for missing / draft. */
export const getDestination = createServerFn({ method: "GET" })
  .inputValidator((input: { type: DestinationType; slug: string }) =>
    z.object({
      type: z.enum(DESTINATION_TYPES as unknown as [DestinationType, ...DestinationType[]]),
      slug: z.string().min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<Destination | null> => {
    const sb = serverPublicClient();
    const { data: row } = await sb
      .from("destinations")
      .select(FIELDS)
      .eq("type", data.type)
      .eq("slug", data.slug)
      .eq("active", true)
      .neq("seo_tier", 4)
      .maybeSingle();
    return (row as Destination | null) ?? null;
  });

/** List destinations of a given type (used by hub pages + sitemaps). */
export const listDestinationsByType = createServerFn({ method: "GET" })
  .inputValidator((input: { type: DestinationType; tiers?: number[]; limit?: number }) =>
    z.object({
      type: z.enum(DESTINATION_TYPES as unknown as [DestinationType, ...DestinationType[]]),
      tiers: z.array(z.number().int().min(1).max(4)).optional(),
      limit: z.number().int().min(1).max(5000).optional(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<Destination[]> => {
    const sb = serverPublicClient();
    let q = sb.from("destinations").select(FIELDS).eq("type", data.type).eq("active", true);
    if (data.tiers?.length) q = q.in("seo_tier", data.tiers);
    else q = q.neq("seo_tier", 4);
    q = q.order("name", { ascending: true }).limit(data.limit ?? 500);
    const { data: rows } = await q;
    return (rows as Destination[]) ?? [];
  });

/** Get several destinations by id (for internal links). */
export const getDestinationsByIds = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).max(50) }).parse(input),
  )
  .handler(async ({ data }): Promise<Destination[]> => {
    if (!data.ids.length) return [];
    const sb = serverPublicClient();
    const { data: rows } = await sb
      .from("destinations")
      .select(FIELDS)
      .in("id", data.ids)
      .eq("active", true)
      .neq("seo_tier", 4);
    return (rows as Destination[]) ?? [];
  });

/** Global search across all destination types. */
export const searchDestinations = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string; types?: DestinationType[]; limit?: number }) =>
    z.object({
      q: z.string().trim().min(1).max(120),
      types: z.array(z.enum(DESTINATION_TYPES as unknown as [DestinationType, ...DestinationType[]])).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<Array<Destination & { href: string; hasPage: boolean }>> => {
    const sb = serverPublicClient();
    // Simple ilike-based search — trigram + tsvector indexes are in place for
    // future upgrade to `.textSearch` / RPC when volume warrants it.
    let q = sb.from("destinations").select(FIELDS).eq("active", true).neq("seo_tier", 4);
    if (data.types?.length) q = q.in("type", data.types);
    // Sanitize: PostgREST `.or()` breaks on `,` and `)` inside the pattern.
    const safe = data.q.replace(/[,()]/g, " ").trim();
    q = q.or(
      `name.ilike.%${safe}%,display_name.ilike.%${safe}%,slug.ilike.%${safe}%,town.ilike.%${safe}%,region.ilike.%${safe}%,council.ilike.%${safe}%`,
    )
      .order("seo_tier", { ascending: true })
      .order("name", { ascending: true })
      .limit(data.limit ?? 30);
    const { data: rows } = await q;
    const list = (rows as Destination[]) ?? [];
    return list.map((d) => ({
      ...d,
      href: destinationHref(d),
      hasPage: d.seo_tier === 1 || d.seo_tier === 2,
    }));
  });
