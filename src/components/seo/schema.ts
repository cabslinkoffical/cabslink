/**
 * JSON-LD schema emitters. Return plain objects; callers stringify into a
 * `<script type="application/ld+json">` via route head() `scripts`.
 */
import type { Destination } from "@/lib/destinations.functions";

const BRAND = {
  name: "CabsLink",
  url: "https://cabslink.com",
  // Must be a URL that actually resolves — `/logo.png` was a 404, which made
  // the Organization logo unusable for every page emitting this graph.
  logo: "https://cabslink.com/__l5e/assets-v1/4150bb87-69a7-4e1d-bedb-54293074a958/cabslink-logo-gold.png",
  /** Verified public profiles only. */
  sameAs: [
    "https://www.trustpilot.com/review/cabslink.com",
    "https://www.instagram.com/cabs_link/",
    "https://web.facebook.com/profile.php?id=61592930561866",
    "https://www.tiktok.com/@cabslink",
    "https://www.youtube.com/@Cabslink",
  ],
};

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: BRAND.url,
    logo: BRAND.logo,
    sameAs: BRAND.sameAs,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: BRAND.url,
    inLanguage: "en-GB",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BRAND.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}


export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${BRAND.url}${it.url}`,
    })),
  };
}

export function faqSchema(qas: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function speakableSchema(cssSelectors: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: { "@type": "SpeakableSpecification", cssSelector: cssSelectors },
  };
}

export function localBusinessSchema(d: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${BRAND.name} — ${d.display_name ?? d.name}`,
    url: `${BRAND.url}/`,
    ...(d.lat && d.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng } }
      : {}),
    areaServed: [d.town, d.council, d.region].filter(Boolean),
  };
}

export function airportSchema(d: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: d.display_name ?? d.name,
    ...(d.meta && typeof d.meta === "object" && "iata" in d.meta
      ? { iataCode: (d.meta as { iata?: string }).iata }
      : {}),
    ...(d.lat && d.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng } }
      : {}),
  };
}

export function touristAttractionSchema(d: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: d.display_name ?? d.name,
    ...(d.lat && d.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng } }
      : {}),
  };
}

export function travelActionSchema(fromName: string, toName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    fromLocation: { "@type": "Place", name: fromName },
    toLocation: { "@type": "Place", name: toName },
    provider: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
  };
}

export function serviceSchema(d: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: d.display_name ?? d.name,
    provider: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    areaServed: "United Kingdom",
  };
}

/** Generic CollectionPage graph for hub pages (services, fleet, areas, blog). */
export function collectionPageSchema(input: {
  name: string;
  description: string;
  url: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: input.name,
        description: input.description,
        url: input.url.startsWith("http") ? input.url : `${BRAND.url}${input.url}`,
        inLanguage: "en-GB",
        isPartOf: { "@type": "WebSite", name: BRAND.name, url: BRAND.url },
        publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.url, logo: BRAND.logo },
      },
      ...(input.breadcrumbs?.length ? [breadcrumbSchema(input.breadcrumbs)] : []),
    ],
  };
}

/** ContactPage graph with the brand's real contact points. */
export function contactPageSchema(input: {
  url: string;
  email: string;
  phones: string[];
  address?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${BRAND.name}`,
    url: input.url.startsWith("http") ? input.url : `${BRAND.url}${input.url}`,
    inLanguage: "en-GB",
    mainEntity: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
      logo: BRAND.logo,
      email: input.email,
      sameAs: BRAND.sameAs,
      ...(input.address ? { address: { "@type": "PostalAddress", streetAddress: input.address } } : {}),
      contactPoint: input.phones.map((telephone) => ({
        "@type": "ContactPoint",
        telephone,
        contactType: "customer service",
        availableLanguage: ["en"],
      })),
    },
  };
}
