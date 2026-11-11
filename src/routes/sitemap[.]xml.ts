import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";

export { PUBLIC_ROUTES };

/**
 * Sitemap index: the core sitemap plus one sub-sitemap per destination type
 * with indexable pages. Each entry carries its child's newest <lastmod>.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { buildCoreEntries, listTypeSitemaps, newestLastmod, SITEMAP_BASE_URL, SITEMAP_HEADERS, SITEMAP_UNAVAILABLE } = await import("@/lib/sitemap-build.server");
        try {
          const [core, types] = await Promise.all([buildCoreEntries(), listTypeSitemaps()]);
          const item = (loc: string, lastmod: string | null) =>
            `  <sitemap><loc>${SITEMAP_BASE_URL}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</sitemap>`;
          const xml = [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
            item("/sitemap-core.xml", newestLastmod(core)),
            ...types.map((t) => item(`/sitemaps/${t.type}.xml`, t.lastmod)),
            `</sitemapindex>`,
          ].join("\n");
          return new Response(xml, { headers: SITEMAP_HEADERS });
        } catch (error) {
          console.error("Sitemap index public query failed", error);
          return SITEMAP_UNAVAILABLE();
        }
      },
    },
  },
});
