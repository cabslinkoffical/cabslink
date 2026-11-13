/** Head tags and structured data for CMS SEO pages, kept apart from the page renderer. */
import { canonicalUrl, normalizeHead } from "@/lib/seo/page-head";
import { safeJsonLd } from "@/lib/safe-json-ld";
import type { PublicSeoPage } from "@/lib/seo-public.functions";
import type { RelatedBundle } from "@/lib/seo-related.functions";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { publicSectionFaqs } from "@/lib/seo/section-faqs";

function buildSeoHeadRaw(
  page: PublicSeoPage,
  origin: string,
  related?: RelatedBundle | null,
  fares?: RouteFareTableData | null,
) {

  const override = page.canonical_override?.trim();
  const url = override && /^https?:\/\//i.test(override) ? canonicalUrl(override) : `${origin}${override || page.path}`;
  const image = page.og_image_url || page.featured_image_url || page.entity?.hero_image_url || null;
  const meta: Array<Record<string, string>> = [
    { title: page.seo_title },
    { name: "description", content: page.meta_description },
    { name: "robots", content: page.robots_status || "index,follow" },
    { property: "og:title", content: page.seo_title },
    { property: "og:description", content: page.meta_description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: page.seo_title },
    { name: "twitter:description", content: page.meta_description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }

  // The business entity is declared once in business-graph.ts and emitted
  // site-wide from __root.tsx; here we only reference it by @id.
  const graph: any[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: page.seo_title,
      description: page.meta_description,
      url,
      ...(image ? { primaryImageOfPage: image } : {}),
      dateModified: page.updated_at,
      isPartOf: { "@id": "https://cabslink.com/#website" },
      about: { "@id": "https://cabslink.com/#business" },
    },
    buildBreadcrumbLd(page, origin),
  ];

  const entityLd = buildEntityLd(page, url);
  if (entityLd) graph.push(entityLd);

  const faqLd = buildFaqLd(page);
  if (faqLd) graph.push(faqLd);

  if (related) {
    const travel = buildTravelActionLd(page, related, url);
    if (travel) graph.push(travel);
  }

  // Published fares make the page citable: an AI answer can only quote a
  // price we have actually put on the page. The price lives as `offers`
  // nested inside the Service node — no top-level Offer, no priceValidUntil
  // and no availability (the fares are re-quoted at booking).
  if (fares && fares.fares.length) {
    const prices = fares.fares.map((f) => f.price);
    const routeName = page.h1.replace(/\s+—.*$/, "");
    graph.push({
      "@type": "Service",
      name: `${routeName} private transfer`,
      serviceType: "Airport taxi transfer",
      url,
      provider: { "@id": "https://cabslink.com/#business" },
      offers: {
        "@type": "Offer",
        name: `${routeName} fixed-price taxi transfer`,
        url,
        priceCurrency: fares.currency || "GBP",
        price: Math.min(...prices).toFixed(2),
        offeredBy: { "@id": "https://cabslink.com/#business" },
        priceSpecification: fares.fares.map((f) => ({
          "@type": "UnitPriceSpecification",
          name: f.className,
          price: f.price.toFixed(2),
          priceCurrency: fares.currency || "GBP",
          valueAddedTaxIncluded: fares.taxIncluded,
        })),
      },
    });
  }


  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({ "@context": "https://schema.org", "@graph": graph }),
      },
    ],
  };
}

function buildBreadcrumbLd(page: PublicSeoPage, origin: string) {
  const parts = page.path.split("/").filter(Boolean);
  const items: any[] = [{ "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` }];
  if (parts.length > 0) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: parts[0][0].toUpperCase() + parts[0].slice(1),
      item: `${origin}/${parts[0]}`,
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: page.h1,
      item: `${origin}${page.path}`,
    });
  }
  return { "@type": "BreadcrumbList", itemListElement: items };
}

function buildEntityLd(page: PublicSeoPage, url: string) {
  const e = page.entity;
  if (!e) return null;
  if (e.kind === "airport") {
    return {
      "@type": "Airport",
      name: e.name,
      iataCode: e.iata_code ?? undefined,
      url,
      ...(e.latitude != null && e.longitude != null
        ? { geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude } }
        : {}),
    };
  }
  if (e.kind === "location") {
    return {
      "@type": "Place",
      name: e.name,
      url,
      ...(e.latitude != null && e.longitude != null
        ? { geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude } }
        : {}),
    };
  }
  if (e.kind === "service") {
    return {
      "@type": "Service",
      name: e.name,
      provider: { "@id": "https://cabslink.com/#business" },
      url,
    };
  }
  return null;
}

function buildFaqLd(page: PublicSeoPage) {
  const items = publicSectionFaqs(page.sections);
  if (!items.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: items.map((it: any) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

function buildTravelActionLd(page: PublicSeoPage, _related: RelatedBundle, url: string) {
  // Route page types stored in seo_pages: city_to_city_route / airport_route.
  if (!/route/.test(page.page_type)) return null;
  // The route's own H1 is the reliable origin/destination source
  // ("Dundee to Edinburgh Airport — Private Transfer").
  const [from, to] = page.h1.replace(/\s+—.*$/, "").split(/\s+to\s+/i);
  if (!from || !to) return null;
  return {
    "@type": "TravelAction",
    name: page.h1,
    url,
    agent: { "@id": "https://cabslink.com/#business" },
    fromLocation: { "@type": "Place", name: from.trim() },
    toLocation: { "@type": "Place", name: to.trim() },

  };
}


/** Same payload, upgraded to the full canonical/OG/Twitter tag set. */
export function buildSeoHead(
  page: PublicSeoPage,
  origin: string,
  related?: RelatedBundle | null,
  fares?: RouteFareTableData | null,
) {
  return normalizeHead(buildSeoHeadRaw(page, origin, related, fares));
}
