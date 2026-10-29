/**
 * Public read paths for the SEO CMS (Phase D).
 * Uses the server publishable client + RLS to only expose published rows.
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

const PAGE_FIELDS =
  "id, page_type, primary_entity_type, primary_entity_id, secondary_entity_type, secondary_entity_id, slug, path, seo_title, meta_description, h1, short_intro, canonical_override, robots_status, featured_image_url, og_image_url, publication_status, last_reviewed_at, updated_at, booking_cta_config";

const SECTION_FIELDS =
  "id, section_type, position, heading, body, structured_payload";

export type PublicSeoSection = {
  id: string;
  section_type: string;
  position: number;
  heading: string | null;
  body: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structured_payload: any;
};

export type PublicSeoPage = {
  id: string;
  page_type: string;
  path: string;
  slug: string;
  seo_title: string;
  meta_description: string;
  h1: string;
  short_intro: string | null;
  canonical_override: string | null;
  robots_status: string;
  featured_image_url: string | null;
  og_image_url: string | null;
  last_reviewed_at: string | null;
  updated_at: string;
  primary_entity_type: string;
  primary_entity_id: string;
  secondary_entity_type: string | null;
  secondary_entity_id: string | null;
  sections: PublicSeoSection[];
  entity: {
    kind: string;
    name?: string | null;
    hero_image_url?: string | null;
    iata_code?: string | null;
    slug?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

async function loadEntity(
  supabase: ReturnType<typeof serverPublicClient>,
  entityType: string,
  entityId: string,
) {
  // seo_pages rows reference the site's real destination records. The old
  // seo_locations/seo_airports/seo_services tables hold different IDs, so
  // joining against them returned null for every page and silently disabled
  // entity-powered hero images, prefills and maps.
  const { data } = await supabase.from("destinations")
    .select("name, display_name, type, slug, lat, lng")
    .eq("id", entityId).maybeSingle();
  if (data) {
    return {
      kind: entityType,
      name: data.display_name ?? data.name,
      slug: data.slug,
      // The destinations table carries no hero image; pages fall back to the
      // type's default image band.
      hero_image_url: null,
      latitude: data.lat,
      longitude: data.lng,
    };
  }
  return null;
}

export const getPublicSeoPageByPath = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(i))
  .handler(async ({ data }): Promise<PublicSeoPage | null> => {
    const supabase = serverPublicClient();
    const { data: page } = await supabase
      .from("seo_pages")
      .select(PAGE_FIELDS)
      .eq("path", data.path)
      .eq("publication_status", "published")
      .maybeSingle();
    if (!page) return null;

    const { data: sections } = await supabase
      .from("seo_page_sections")
      .select(SECTION_FIELDS)
      .eq("page_id", page.id)
      .eq("visible", true)
      .order("position", { ascending: true });

    const entity = await loadEntity(supabase, page.primary_entity_type, page.primary_entity_id);

    return {
      ...(page as any),
      sections: (sections ?? []) as PublicSeoSection[],
      entity,
    } as PublicSeoPage;
  });

export const listPublishedSeoPaths = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("path, updated_at, robots_status")
    .eq("publication_status", "published");
  return (data ?? [])
    .filter((r: any) => !String(r.robots_status ?? "").includes("noindex"))
    // `/locations/*` is a legacy duplicate that now 301s to `/areas/*`.
    // Redirecting URLs must never appear in a sitemap.
    .filter((r: any) => !String(r.path ?? "").startsWith("/locations/"));
});

/**
 * Coordinates for one place, read from the site's own destination records.
 * Service + location pages use this to draw a map of the area they serve.
 */
export const getPublicPlaceCoords = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const { data: rows } = await supabase
      .from("destinations")
      .select("display_name, name, lat, lng")
      .eq("slug", data.slug)
      .limit(1);
    const row = rows?.[0];
    if (!row) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const label = row.display_name ?? row.name;
    return label ? { lat, lng, label } : null;
  });

export const resolvePublicRedirect = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(i))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const { data: row } = await supabase
      .from("seo_redirects")
      .select("to_path, status_code")
      .eq("from_path", data.path)
      .eq("active", true)
      .maybeSingle();
    return row ?? null;
  });
