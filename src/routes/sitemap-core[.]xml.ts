/**
 * Core sitemap — the sitemap-index at /sitemap.xml points here for static
 * routes (home, services, legal, hubs) plus tour and legacy CMS paths.
 *
 * <changefreq> is never emitted: Google ignores it and uses <lastmod> to
 * schedule recrawls. Database-backed URLs carry their row's real `updated_at`;
 * code-defined static routes have no page-specific timestamp, so they are
 * emitted with <loc> only (valid, and better than a fabricated date).
 * Any date earlier than MIN_LASTMOD is treated as malformed and dropped.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PUBLIC_ROUTES, fetchAllPages, dedupeSitemapEntries } from "@/lib/sitemap-routes";

const BASE_URL = "https://cabslink.com";

/** Guard against epoch/garbage timestamps reaching Google. */
const MIN_LASTMOD = "2020-01-01";

function isoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toISOString().slice(0, 10);
  return day < MIN_LASTMOD ? null : day;
}


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

/** URL prefixes served by the per-destination-type sub-sitemaps. */
const DESTINATION_OWNED_PREFIXES = [
  "/areas/", "/airports/", "/stations/", "/cruise-ports/", "/universities/",
  "/hospitals/", "/corporate/", "/attractions/", "/distilleries/", "/guides/",
];

export const Route = createFileRoute("/sitemap-core.xml")({
  server: {
    handlers: {
      GET: async () => {
        // path -> lastmod (YYYY-MM-DD) or null when no trustworthy
        // page-specific timestamp exists (then <lastmod> is omitted).
        const entries = new Map<string, string | null>();

        for (const p of PUBLIC_ROUTES) entries.set(p, null);

        const sb = serverPublicClient();

        try {
          const [tours, seo, blogs] = await Promise.all([
            fetchAllPages((from, to) => sb.from("scenic_route_templates").select("slug, updated_at").eq("active", true).eq("published", true).order("id").range(from, to)),
            fetchAllPages((from, to) => sb.from("seo_pages").select("path, updated_at, robots_status, canonical_override").eq("publication_status", "published").order("id").range(from, to)),
            fetchAllPages((from, to) => sb.from("blog_posts").select("slug, updated_at, robots_status, canonical_override").eq("status", "published").order("id").range(from, to)),
          ]);
          for (const t of tours) {
            entries.set(`/tours/${t.slug}`, isoDay(t.updated_at));
          }
          // Destination-backed URLs are advertised by the per-type
          // sub-sitemaps; listing them here too would duplicate entries.
          for (const r of seo) {
            if (r.robots_status.includes("noindex") || r.path.startsWith("/locations/")) continue;
            if (r.canonical_override && r.canonical_override !== `${BASE_URL}${r.path}` && r.canonical_override !== r.path) continue;
            if (DESTINATION_OWNED_PREFIXES.some((pre) => r.path.startsWith(pre))) continue;
            entries.set(r.path, isoDay(r.updated_at));
          }
          for (const b of blogs) {
            if (b.robots_status.includes("noindex")) continue;
            const path = `/blog/${b.slug}`;
            if (b.canonical_override && b.canonical_override !== `${BASE_URL}${path}` && b.canonical_override !== path) continue;
            entries.set(`/blog/${b.slug}`, isoDay(b.updated_at));
          }
        } catch (error) {
          console.error("Core sitemap public query failed", error);
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...dedupeSitemapEntries(entries).map(([p, lastmod]) =>
            `  <url><loc>${BASE_URL}${p}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
