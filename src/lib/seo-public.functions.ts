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
  if (entityType === "location") {
    const { data } = await supabase.from("seo_locations")
      .select("name, slug, latitude, longitude").eq("id", entityId).maybeSingle();
    return data ? { kind: "location", ...data } : null;
  }
  if (entityType === "airport") {
    const { data } = await supabase.from("seo_airports")
      .select("name, slug, iata_code, hero_image_url, latitude, longitude").eq("id", entityId).maybeSingle();
    return data ? { kind: "airport", ...data } : null;
  }
  if (entityType === "service") {
    const { data } = await supabase.from("seo_services")
      .select("name, slug, hero_image_url").eq("id", entityId).maybeSingle();
    return data ? { kind: "service", ...data } : null;
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
  return (data ?? []).filter((r: any) => !String(r.robots_status ?? "").includes("noindex"));
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
