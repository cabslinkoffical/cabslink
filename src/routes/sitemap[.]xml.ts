import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedToursImpl } from "@/lib/tours.functions";

const BASE_URL = "https://cabslink.lovable.app";

export const PUBLIC_ROUTES = [
  "/", "/about", "/services", "/airport-transfers", "/vip-transfers",
  "/corporate-travel", "/tours", "/fleet", "/drive-with-us",
  "/corporate-booking", "/contact", "/book",
  "/privacy", "/terms", "/cookies",
  "/booking-policy", "/refund-policy", "/accessibility",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let tourPaths: string[] = [];
        try {
          const tours = await listPublishedToursImpl();
          tourPaths = tours.map((t) => `/tours/${t.slug}`);
        } catch {
          tourPaths = [];
        }
        const paths = [...PUBLIC_ROUTES, ...tourPaths];
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
