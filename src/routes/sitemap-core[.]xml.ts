/** Core sitemap: static routes, tours, CMS pages, blog. Built in src/lib/sitemap-build.server.ts. */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap-core.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { buildCoreEntries, urlsetXml, SITEMAP_HEADERS, SITEMAP_UNAVAILABLE } = await import("@/lib/sitemap-build.server");
        try {
          return new Response(urlsetXml(await buildCoreEntries()), { headers: SITEMAP_HEADERS });
        } catch (error) {
          console.error("Core sitemap public query failed", error);
          return SITEMAP_UNAVAILABLE();
        }
      },
    },
  },
});
