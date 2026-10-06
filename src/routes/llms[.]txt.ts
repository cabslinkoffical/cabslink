import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { publicServerClient } from "@/lib/seo/public-client.server";
import { FACTS } from "@/lib/site-facts";

const BASE = "https://cabslink.com";

/** /llms.txt — a plain summary of the site for AI assistants, built from live data. */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const sb = publicServerClient();
        const [tours, posts, airports, routes] = await Promise.all([
          sb.from("scenic_route_templates").select("slug, name, short_description").eq("published", true).order("display_order"),
          sb.from("blog_posts").select("slug, title, excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(50),
          sb.from("destinations").select("slug, name").eq("type", "airport").eq("active", true).eq("noindex", false).order("name"),
          sb.from("seo_pages").select("path, h1, seo_title").eq("publication_status", "published").like("path", "/routes/%").order("path").limit(100),
        ]);
        const line = (name: string, url: string, note?: string | null) =>
          `- [${name}](${url})${note ? `: ${note.replace(/\s+/g, " ").trim()}` : ""}`;
        const out = [
          "# Cabslink",
          "",
          `> Cabslink is a pre-booked private hire and airport transfer company based in Edinburgh, Scotland, offering fixed-fare transfers, private day tours and hourly hire across the UK.`,
          "",
          "## Key facts",
          `- Company: ${FACTS.company.legalName}, company number ${FACTS.company.companyNumber}, ${FACTS.company.registeredOffice}`,
          `- Phone: ${FACTS.company.phone}`,
          "- Booking and quotes: " + `${BASE}/book`,
          "- Payment: card through Stripe at the end of booking (Visa, Mastercard, American Express)",
          "",
          "## Main pages",
          line("Airport transfers", `${BASE}/airports`),
          line("Private tours", `${BASE}/tours`),
          line("Fleet", `${BASE}/fleet`),
          line("Areas we cover", `${BASE}/areas`),
          line("Booking policy", `${BASE}/booking-policy`),
          line("Contact", `${BASE}/contact`),
          "",
          "## Tours",
          ...(tours.data ?? []).map((t: any) => line(t.name, `${BASE}/tours/${t.slug}`, t.short_description)),
          "",
          "## Airports",
          ...(airports.data ?? []).map((a: any) => line(a.name, `${BASE}/airports/${a.slug}`)),
          "",
          "## Routes",
          ...(routes.data ?? []).map((r: any) => line(r.h1 ?? r.seo_title ?? r.path, `${BASE}${r.path}`)),
          "",
          "## Guides",
          ...(posts.data ?? []).map((p: any) => line(p.title, `${BASE}/blog/${p.slug}`, p.excerpt)),
          "",
        ].filter((x) => x !== null).join("\n");
        return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
