/**
 * Per-type sub-sitemap. URL: /sitemaps/{type}.xml
 * File pattern: `{$type}[.]xml` — braces mark the dynamic segment `$type`,
 * `[.]xml` is the literal `.xml` suffix.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { destinationHref, DESTINATION_TYPES, type DestinationType } from "@/lib/destinations.functions";

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
          .select("type,slug,updated_at,noindex")
          .eq("type", type)
          .eq("active", true)
          .eq("seo_tier", 1)
          .eq("noindex", false)
          .limit(50000);
        const rows = data ?? [];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...rows.map((r) => {
            const href = destinationHref({ type: r.type as DestinationType, slug: r.slug });
            return `  <url><loc>${BASE_URL}${href}</loc><lastmod>${r.updated_at}</lastmod></url>`;
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
