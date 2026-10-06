import { describe, it, expect } from "vitest";
import { normalizeHead } from "@/lib/seo/page-head";
import { readFileSync } from "node:fs";

const head = (graph: unknown) =>
  normalizeHead({
    meta: [{ title: "T" }, { name: "description", content: "D" }],
    links: [{ rel: "canonical", href: "https://cabslink.com/x" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(graph) }],
  });

describe("Phase 6 — page structured data", () => {
  it("every JSON-LD block is escaped and still parses", () => {
    const out = head({ "@type": "FAQPage", name: "</script><b>" });
    const ld = (out as any).scripts[0].children as string;
    expect(ld).not.toContain("</script>");
    expect(JSON.parse(ld).name).toBe("</script><b>");
  });

  it("tour pages emit TouristTrip with provider, itinerary, Offer and breadcrumbs", () => {
    const src = readFileSync("src/routes/tours.$slug.tsx", "utf8");
    for (const k of ['"TouristTrip"', '"#business"', '"ItemList"', '"Offer"', '"BreadcrumbList"']) {
      expect(src.includes(k) || src.includes(k.replace('"#', 'https://cabslink.com/#'))).toBe(true);
    }
  });

  it("route and blog pages keep Offer, FAQPage, Article and BreadcrumbList", () => {
    const journey = readFileSync("src/components/site/JourneyPage.tsx", "utf8");
    for (const k of ['"Offer"', '"FAQPage"', '"BreadcrumbList"']) expect(journey).toContain(k);
    const blog = readFileSync("src/routes/blog.$slug.tsx", "utf8");
    for (const k of ['"Article"', '"Person"', "datePublished", "dateModified", '"FAQPage"']) expect(blog).toContain(k);
    expect(readFileSync("src/components/site/BlogArticle.tsx", "utf8")).not.toMatch(/Answered below in structured data/);
  });
});
