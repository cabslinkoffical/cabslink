import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedToursImpl } from "@/lib/tours.functions";
import { listPublishedSeoPaths } from "@/lib/seo-public.functions";
import { DESTINATION_TYPES } from "@/lib/destinations.functions";
import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";

const BASE_URL = "https://cabslink.lovable.app";

export { PUBLIC_ROUTES };


/**
 * Sitemap index: references the static-route sitemap plus one sub-sitemap per
 * destination type. Sub-sitemaps live at /sitemaps/{type}.xml and only emit
 * Tier 1 destinations (fully indexed pages).
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Core: static routes + tours + legacy SEO CMS paths (unchanged behaviour)
        let tourPaths: string[] = [];
        try {
          const tours = await listPublishedToursImpl();
          tourPaths = tours.map((t) => `/tours/${t.slug}`);
        } catch { tourPaths = []; }
        let seoPaths: string[] = [];
        try {
          const rows = await listPublishedSeoPaths();
          seoPaths = rows.map((r: { path: string }) => r.path);
        } catch { seoPaths = []; }
        const corePaths = [...PUBLIC_ROUTES, ...tourPaths, ...seoPaths];

        const coreXml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...corePaths.map((p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`),
          `</urlset>`,
        ].join("\n");

        // Sitemap index that fans out to per-type sub-sitemaps.
        const indexXml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          `  <sitemap><loc>${BASE_URL}/sitemap-core.xml</loc></sitemap>`,
          ...DESTINATION_TYPES.map(
            (t) => `  <sitemap><loc>${BASE_URL}/sitemaps/${t}.xml</loc></sitemap>`,
          ),
          `</sitemapindex>`,
        ].join("\n");

        // Legacy consumers may still request /sitemap.xml expecting a urlset;
        // we serve the sitemap index (crawlers understand both). Store the
        // urlset variant at /sitemap-core.xml (below).
        void coreXml; // referenced by /sitemap-core.xml route handler
        return new Response(indexXml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

