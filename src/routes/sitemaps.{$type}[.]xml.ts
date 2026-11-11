/**
 * Per-type sub-sitemap. URL: /sitemaps/{type}.xml
 * File pattern: `{$type}[.]xml` — braces mark the dynamic segment `$type`.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { DESTINATION_TYPES, type DestinationType } from "@/lib/destinations.functions";

export const Route = createFileRoute("/sitemaps/{$type}.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const type = (params as { type: string }).type as DestinationType;
        if (!DESTINATION_TYPES.includes(type)) return new Response("Not found", { status: 404 });
        const { buildTypeEntries, urlsetXml, SITEMAP_HEADERS, SITEMAP_UNAVAILABLE } = await import("@/lib/sitemap-build.server");
        try {
          return new Response(urlsetXml(await buildTypeEntries(type)), { headers: SITEMAP_HEADERS });
        } catch (error) {
          console.error("Type sitemap public query failed", error);
          return SITEMAP_UNAVAILABLE();
        }
      },
    },
  },
});
