/**
 * Head tags and structured data for journey (route) pages. Kept apart from the
 * JourneyPage layout so route head()/loader code doesn't pull the whole page
 * layout into the site's main script.
 */
import { normalizeHead } from "@/lib/seo/page-head";
import type { JourneyContent } from "@/lib/seo/journeys";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { BUSINESS_ID } from "@/lib/seo/business-graph";

const ORIGIN = "https://cabslink.com";

/**
 * FAQ answers may reference the real saloon fare with `{{saloonFare}}` rather
 * than a hardcoded figure. The token is filled from the live pricing engine;
 * if no fare is available the question is dropped rather than shipped with a
 * placeholder or a vague "price on request".
 */
export function resolveFaqs(c: JourneyContent, fares?: RouteFareTableData | null) {
  const cheapest = fares?.fares.length
    ? fares.fares.reduce((a, b) => (b.price < a.price ? b : a))
    : null;
  const saloon =
    fares?.fares.find((f) => /^saloon$/i.test(f.className) || f.classSlug === "saloon") ?? cheapest;
  const value = saloon && fares ? `${fares.currencySymbol}${saloon.price.toFixed(2)}` : null;

  return c.faqs
    .map((f) => ({ ...f, a: value ? f.a.replaceAll("{{saloonFare}}", value) : f.a }))
    .filter((f) => !f.a.includes("{{"));
}



/** TravelAction + Offer + FAQPage + BreadcrumbList graph for a journey page. */
export function journeySchema(c: JourneyContent, fares?: RouteFareTableData | null) {
  const url = `${ORIGIN}${c.canonicalPath}`;
  const pair = `${c.from.name} to ${c.to.name}`;
  const currency = fares?.currency || "GBP";
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...(fares && fares.fares.length
        ? [
            {
              "@type": "Offer",
              name: `${pair} fixed-price taxi transfer`,
              url,
              priceCurrency: currency,
              // Headline price = cheapest publishable vehicle class.
              price: Math.min(...fares.fares.map((f) => f.price)).toFixed(2),
              availability: "https://schema.org/InStock",
              priceValidUntil: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
              areaServed: { "@type": "Country", name: "United Kingdom" },
              priceSpecification: fares.fares.map((f) => ({
                "@type": "UnitPriceSpecification",
                name: f.className,
                price: f.price.toFixed(2),
                priceCurrency: currency,
                valueAddedTaxIncluded: fares.taxIncluded,
              })),
              itemOffered: {
                "@type": "Service",
                name: `${pair} private transfer`,
                serviceType: "Taxi and private transfer",
                provider: { "@id": BUSINESS_ID },
              },
            },
          ]
        : []),

      {
        "@type": "TravelAction",
        name: `${c.from.name} to ${c.to.name} private transfer`,
        description: c.metaDescription,
        url,
        fromLocation: { "@type": "Place", name: c.from.name },
        toLocation: { "@type": "Place", name: c.to.name },
        distance: `${c.miles} mi`,
        provider: { "@id": BUSINESS_ID },
      },
      {
        "@type": "FAQPage",
        mainEntity: resolveFaqs(c, fares).map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),

      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
          { "@type": "ListItem", position: 2, name: "Popular routes", item: `${ORIGIN}/routes` },
          {
            "@type": "ListItem",
            position: 3,
            name: `${c.from.name} to ${c.to.name}`,
            item: url,
          },
        ],
      },
    ],
  };
}

function journeyHeadRaw(c: JourneyContent, fares?: RouteFareTableData | null) {
  const url = `${ORIGIN}${c.canonicalPath}`;
  return {
    meta: [
      { title: c.metaTitle },
      { name: "description", content: c.metaDescription },
      { property: "og:title", content: c.metaTitle },
      { property: "og:description", content: c.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      // Awaiting sign-off: viewable for review, never indexable yet.
      ...(c.review ? [{ name: "robots", content: "noindex,follow" }] : []),
    ],

    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(journeySchema(c, fares)) }],

  };
}


/** Same payload, upgraded to the full canonical/OG/Twitter tag set. */
export function journeyHead(c: JourneyContent, fares?: RouteFareTableData | null) {
  return normalizeHead(journeyHeadRaw(c, fares));
}
