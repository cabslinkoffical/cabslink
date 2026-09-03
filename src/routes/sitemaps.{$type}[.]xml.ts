/**
 * Per-type sub-sitemap. URL: /sitemaps/{type}.xml
 * File pattern: `{$type}[.]xml` — braces mark the dynamic segment `$type`,
 * `[.]xml` is the literal `.xml` suffix.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { destinationHref, DESTINATION_TYPES, type Destination, type DestinationType } from "@/lib/destinations.functions";
import { evaluateQuality } from "@/lib/seo/quality";


const BASE_URL = "https://cabslink.com";

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

export const Route = createFileRoute("/sitemaps/{$type}.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const type = (params as { type: string }).type as DestinationType;
        if (!DESTINATION_TYPES.includes(type)) return new Response("Not found", { status: 404 });
        const sb = serverPublicClient();
        const { data } = await sb
          .from("destinations")
          .select("*")
          .eq("type", type)
          .eq("active", true)
          .eq("noindex", false)
          .eq("seo_tier", 1)
          .limit(50000);

        // Only advertise URLs the page itself renders as indexable — the same
        // quality gate the head builder uses, so the sitemap can never
        // contradict a `noindex` directive.
        const rows = (data ?? []).filter(
          (r) => !evaluateQuality(r as unknown as Destination).effectiveNoindex,
        );

        // Guard: never emit an epoch/garbage date — omit <lastmod> instead.
        const MIN_LASTMOD = "2020-01-01";
        const isoDay = (value: string | null | undefined): string | null => {
          if (!value) return null;
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return null;
          const day = d.toISOString().slice(0, 10);
          return day < MIN_LASTMOD ? null : day;
        };

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...rows.map((r) => {
            const href = destinationHref({ type: r.type as DestinationType, slug: r.slug });
            // W3C date form; Google reads lastmod, not changefreq.
            const day = isoDay(r.updated_at as string | null);
            return `  <url><loc>${BASE_URL}${href}</loc>${day ? `<lastmod>${day}</lastmod>` : ""}</url>`;
          }),
          `</urlset>`,
        ].join("\n");


        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
