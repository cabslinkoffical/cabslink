import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { pickRelatedLinks, rankRelatedContent, type RelatedGroups } from "@/lib/related-links";
import { guideFor } from "@/content/place-guides";
import { fetchAllPages } from "@/lib/sitemap-routes";
import { z } from "zod";

function serverPublicClient() {
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

/** Indexable airports, areas and tours used by the shared related-pages block. */
async function loadPool() {
  const sb = serverPublicClient();
  const [dest, tours, posts] = await Promise.all([
    fetchAllPages((from, to) => sb
      .from("destinations")
      .select("type,slug,name,display_name,lat,lng")
      .in("type", ["airport", "city", "town"])
      .eq("active", true)
      .eq("noindex", false)
      .neq("seo_tier", 4)
      .order("id").range(from, to)),
    fetchAllPages((from, to) => sb.from("scenic_route_templates").select("slug,name,theme_group,origin_label,destination_label,short_description").eq("active", true).eq("published", true).order("id").range(from, to)),
    fetchAllPages((from, to) => sb.from("blog_posts").select("slug,title,related_location_slugs,related_route_slugs").eq("status", "published").not("robots_status", "ilike", "%noindex%").order("id").range(from, to)),
  ]);
  const rows = dest as Array<{ type: string; slug: string; name: string; display_name: string | null; lat: number | null; lng: number | null }>;
  const toCand = (r: (typeof rows)[number], seg: string) => ({
    href: `/${seg}/${r.slug}`,
    label: r.display_name || r.name,
    lat: r.lat,
    lng: r.lng,
  });
  return {
    airports: rows.filter((r) => r.type === "airport").map((r) => toCand(r, "airports")),
    areas: rows.filter((r) => r.type !== "airport").map((r) => toCand(r, "areas")),
    tours: tours
      .filter((t) => t.slug && t.name)
      .map((t) => ({ href: `/tours/${t.slug}`, label: t.name, theme: t.theme_group, context: `${t.origin_label} ${t.destination_label} ${t.short_description ?? ""}` })),
    articles: posts.map((p) => ({ href: `/blog/${p.slug}`, label: p.title, context: [...(p.related_location_slugs ?? []), ...(p.related_route_slugs ?? [])].join(" ") })),
  };
}

export const getRelatedLinkPool = createServerFn({ method: "GET" }).handler(loadPool);

export const getSelectedRelatedLinks = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ path: z.string().startsWith("/").max(300), center: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable() }).parse(data))
  .handler(async ({ data }): Promise<RelatedGroups> => {
    const all = await loadPool();
    const selected = pickRelatedLinks(all, data.path, data.center);
    const guide = guideFor(data.path);
    const context = [data.path, ...(guide?.routeSlugs ?? []), ...(guide?.sections.flatMap((s) => [s.heading, ...s.paragraphs]) ?? [])].join(" ");
    const tour = all.tours.find((t) => t.href === data.path);
    const compact = (c: { href: string; label: string }) => ({ href: c.href, label: c.label });
    return {
      airports: selected.airports.map(compact),
      areas: selected.areas.map(compact),
      tours: rankRelatedContent(all.tours, data.path, context, tour?.theme).map(compact),
      articles: rankRelatedContent(all.articles, data.path, context).map(compact),
    };
  });

export const relatedLinkPoolQuery = () =>
  queryOptions({ queryKey: ["related-link-pool"], queryFn: () => getRelatedLinkPool(), staleTime: 10 * 60_000 });

export const selectedRelatedLinksQuery = (path: string, center: { lat: number; lng: number } | null) =>
  queryOptions({ queryKey: ["selected-related-links", path, center], queryFn: () => getSelectedRelatedLinks({ data: { path, center } }), staleTime: 5 * 60_000 });
