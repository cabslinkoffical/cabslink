import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DESTINATION_TYPES, type Destination, type DestinationType } from "@/lib/destinations.functions";
import { evaluateQuality } from "@/lib/seo/quality";

import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";

const BASE_URL = "https://cabslink.com";

export { PUBLIC_ROUTES };

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

/**
 * Sitemap index: references the static-route sitemap (/sitemap-core.xml) plus
 * one sub-sitemap per destination type that actually has indexable pages, so
 * crawlers never fetch empty urlsets.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let types: DestinationType[] = [];
        try {
          const sb = serverPublicClient();
          const { data } = await sb
            .from("destinations")
            .select("*")
            .eq("active", true)
            .eq("seo_tier", 1)
            .eq("noindex", false)
            .limit(50000);
          // Mirror the renderer's quality gate so we never advertise a
          // sub-sitemap whose pages all render `noindex`.
          const present = new Set(
            (data ?? [])
              .filter((r) => !evaluateQuality(r as unknown as Destination).effectiveNoindex)
              .map((r) => r.type as DestinationType),
          );
          types = DESTINATION_TYPES.filter((t) => present.has(t));
        } catch {
          types = [];
        }


        const indexXml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          `  <sitemap><loc>${BASE_URL}/sitemap-core.xml</loc></sitemap>`,
          ...types.map((t) => `  <sitemap><loc>${BASE_URL}/sitemaps/${t}.xml</loc></sitemap>`),
          `</sitemapindex>`,
        ].join("\n");

        return new Response(indexXml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});


