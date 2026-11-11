/**
 * Single source for sitemap URL lists, used by /sitemap.xml, /sitemap-core.xml,
 * /sitemaps/{type}.xml and the admin "Notify search engines" submission.
 * lastmod comes only from a record's own updated_at; code-defined pages with
 * no page-specific timestamp are emitted without <lastmod>.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PUBLIC_ROUTES, fetchAllPages, dedupeSitemapEntries } from "@/lib/sitemap-routes";
import { indexableRegionPaths } from "@/lib/seo/region-content";
import { categoryIsIndexable } from "@/lib/blog-category-seo";
import { destinationHref, DESTINATION_TYPES, type Destination, type DestinationType } from "@/lib/destinations.functions";
import { evaluateQuality } from "@/lib/seo/quality";

export const SITEMAP_BASE_URL = "https://cabslink.com";
const MIN_LASTMOD = "2020-01-01";

export function isoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toISOString().slice(0, 10);
  return day < MIN_LASTMOD ? null : day;
}

export function newestLastmod(entries: Array<[string, string | null]>): string | null {
  let best: string | null = null;
  for (const [, d] of entries) if (d && (!best || d > best)) best = d;
  return best;
}

export function sitemapPublicClient() {
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

const DESTINATION_OWNED_PREFIXES = [
  "/areas/", "/airports/", "/stations/", "/cruise-ports/", "/universities/",
  "/hospitals/", "/corporate/", "/attractions/", "/distilleries/", "/guides/",
];

/** Core sitemap entries. Throws on query failure (callers return 503). */
export async function buildCoreEntries(): Promise<Array<[string, string | null]>> {
  const entries = new Map<string, string | null>();
  for (const p of PUBLIC_ROUTES) entries.set(p, null);
  const sb = sitemapPublicClient();
  const [tours, seo, blogs, cats, places] = await Promise.all([
    fetchAllPages((from, to) => sb.from("scenic_route_templates").select("slug, updated_at").eq("active", true).eq("published", true).order("id").range(from, to)),
    fetchAllPages((from, to) => sb.from("seo_pages").select("path, updated_at, robots_status, canonical_override").eq("publication_status", "published").order("id").range(from, to)),
    fetchAllPages((from, to) => sb.from("blog_posts").select("slug, updated_at, robots_status, canonical_override, category_id").eq("status", "published").order("id").range(from, to)),
    fetchAllPages((from, to) => sb.from("blog_categories").select("id, slug").eq("active", true).order("id").range(from, to)),
    fetchAllPages((from, to) => sb.from("destinations").select("type, slug, name, display_name, lat, lng, region, seo_tier, updated_at").eq("active", true).not("region", "is", null).order("id").range(from, to)),
  ]);
  const perCategory = new Map<string, { count: number; lastmod: string | null }>();
  for (const b of blogs) {
    if (!b.category_id) continue;
    const cur = perCategory.get(b.category_id) ?? { count: 0, lastmod: null };
    const day = isoDay(b.updated_at);
    perCategory.set(b.category_id, { count: cur.count + 1, lastmod: day && (!cur.lastmod || day > cur.lastmod) ? day : cur.lastmod });
  }
  for (const c of cats) {
    const stat = perCategory.get(c.id);
    if (stat && categoryIsIndexable(stat.count)) entries.set(`/blog/category/${c.slug}`, stat.lastmod);
  }
  for (const path of indexableRegionPaths(
    places.map((p) => ({ ...p, type: p.type as string })),
    (p) => destinationHref({ type: p.type as DestinationType, slug: p.slug }),
  )) entries.set(path, null);
  for (const t of tours) entries.set(`/tours/${t.slug}`, isoDay(t.updated_at));
  for (const r of seo) {
    if (r.robots_status.includes("noindex") || r.path.startsWith("/locations/")) continue;
    if (r.canonical_override && r.canonical_override !== `${SITEMAP_BASE_URL}${r.path}` && r.canonical_override !== r.path) continue;
    if (DESTINATION_OWNED_PREFIXES.some((pre) => r.path.startsWith(pre))) continue;
    entries.set(r.path, isoDay(r.updated_at));
  }
  for (const b of blogs) {
    if (b.robots_status.includes("noindex")) continue;
    const path = `/blog/${b.slug}`;
    if (b.canonical_override && b.canonical_override !== `${SITEMAP_BASE_URL}${path}` && b.canonical_override !== path) continue;
    entries.set(path, isoDay(b.updated_at));
  }
  return dedupeSitemapEntries(entries);
}

async function indexableDestinations(type?: DestinationType) {
  const sb = sitemapPublicClient();
  const data = await fetchAllPages((from, to) => {
    let q = sb.from("destinations").select("*").eq("active", true).eq("seo_tier", 1).eq("noindex", false);
    if (type) q = q.eq("type", type);
    return q.order("id").range(from, to);
  });
  return (data ?? []).filter((r) => !evaluateQuality(r as unknown as Destination).effectiveNoindex);
}

/** Entries for one destination-type sub-sitemap. Throws on query failure. */
export async function buildTypeEntries(type: DestinationType): Promise<Array<[string, string | null]>> {
  const rows = await indexableDestinations(type);
  return dedupeSitemapEntries(rows.map((r): [string, string | null] => [
    destinationHref({ type: r.type as DestinationType, slug: r.slug }),
    isoDay(r.updated_at as string | null),
  ]));
}

/** Destination types that have indexable pages, with each child sitemap's newest lastmod. */
export async function listTypeSitemaps(): Promise<Array<{ type: DestinationType; lastmod: string | null }>> {
  const rows = await indexableDestinations();
  const newest = new Map<string, string | null>();
  for (const r of rows) {
    const d = isoDay(r.updated_at as string | null);
    const cur = newest.get(r.type) ?? null;
    newest.set(r.type, d && (!cur || d > cur) ? d : cur);
  }
  return DESTINATION_TYPES.filter((t) => newest.has(t)).map((t) => ({ type: t, lastmod: newest.get(t) ?? null }));
}

/** Every URL in every child sitemap (absolute). */
export async function allSitemapUrls(): Promise<string[]> {
  const [core, types] = await Promise.all([buildCoreEntries(), listTypeSitemaps()]);
  const lists = await Promise.all(types.map((t) => buildTypeEntries(t.type)));
  return [...core, ...lists.flat()].map(([p]) => `${SITEMAP_BASE_URL}${p}`);
}

export function urlsetXml(entries: Array<[string, string | null]>): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(([p, d]) => `  <url><loc>${SITEMAP_BASE_URL}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`),
    `</urlset>`,
  ].join("\n");
}

export const SITEMAP_HEADERS = { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" };
export const SITEMAP_UNAVAILABLE = () => new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
