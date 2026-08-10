/**
 * Core sitemap — the sitemap-index at /sitemap.xml points here for static
 * routes (home, services, legal, hubs) plus tour and legacy CMS paths.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedToursImpl } from "@/lib/tours.functions";
import { listPublishedSeoPaths } from "@/lib/seo-public.functions";
import { listPublishedBlogPathsImpl } from "@/lib/blog.functions";
import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";

const BASE_URL = "https://cabslink.com";

/** URL prefixes served by the per-destination-type sub-sitemaps. */
const DESTINATION_OWNED_PREFIXES = [
  "/areas/", "/airports/", "/stations/", "/cruise-ports/", "/universities/",
  "/hospitals/", "/corporate/", "/attractions/", "/distilleries/", "/guides/",
];


export const Route = createFileRoute("/sitemap-core.xml")({
  server: {
    handlers: {
      GET: async () => {
        let tourPaths: string[] = [];
        try {
          const tours = await listPublishedToursImpl();
          tourPaths = tours.map((t) => `/tours/${t.slug}`);
        } catch { tourPaths = []; }
        let seoPaths: string[] = [];
        try {
          const rows = await listPublishedSeoPaths();
          // Destination-backed URLs are advertised by the per-type
          // sub-sitemaps; listing them here too would duplicate entries.
          seoPaths = rows
            .map((r: { path: string }) => r.path)
            .filter((p) => !DESTINATION_OWNED_PREFIXES.some((pre) => p.startsWith(pre)));
        } catch { seoPaths = []; }

        let blogPaths: string[] = [];
        try { blogPaths = await listPublishedBlogPathsImpl(); } catch { blogPaths = []; }
        const paths = [...PUBLIC_ROUTES, ...tourPaths, ...seoPaths, ...blogPaths];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...paths.map((p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
