/** Head tags and structured data for travel guides, kept apart from the page layout. */
import { normalizeHead } from "@/lib/seo/page-head";
import type { GuideRecord } from "@/lib/seo/guides";
import { BUSINESS_ID } from "@/lib/seo/business-graph";

const ORIGIN = "https://cabslink.com";

export function guideSchema(g: GuideRecord) {
  const url = `${ORIGIN}/guides/${g.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.metaTitle,
        description: g.metaDescription,
        url,
        dateModified: g.lastChecked,
        author: { "@id": BUSINESS_ID },
        publisher: { "@id": BUSINESS_ID },
      },
      ...(g.dayTrips && g.dayTrips.length
        ? [
            {
              "@type": "ItemList",
              name: g.cardTitle,
              itemListElement: g.dayTrips.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.name,
                item: {
                  "@type": "TouristAttraction",
                  name: t.name,
                  description: t.whatsThere,
                },
              })),
            },
          ]
        : []),
      ...(g.faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: g.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
          { "@type": "ListItem", position: 2, name: "Travel guides", item: `${ORIGIN}/guides` },
          { "@type": "ListItem", position: 3, name: g.cardTitle, item: url },
        ],
      },
    ],
  };
}

function guideHeadRaw(g: GuideRecord) {
  const url = `${ORIGIN}/guides/${g.slug}`;
  return {
    meta: [
      { title: g.metaTitle },
      { name: "description", content: g.metaDescription },
      { property: "og:title", content: g.metaTitle },
      { property: "og:description", content: g.metaDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...(g.review ? [{ name: "robots", content: "noindex,follow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(guideSchema(g)) }],
  };
}


/** Same payload, upgraded to the full canonical/OG/Twitter tag set. */
export function guideHead(g: GuideRecord) {
  return normalizeHead(guideHeadRaw(g));
}
