import { normalizeHead } from "@/lib/seo/page-head";
import { faqSchema, breadcrumbSchema } from "@/components/seo/schema";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { LANDING_PAGES } from "@/content/landing-pages";

const SITE = "https://cabslink.com";

export function landingHead(path: keyof typeof LANDING_PAGES | string) {
  const p = LANDING_PAGES[path];
  const url = `${SITE}${p.path}`;
  return normalizeHead({
    meta: [
      { title: p.metaTitle },
      { name: "description", content: p.metaDescription },
      { property: "og:title", content: p.metaTitle },
      { property: "og:description", content: p.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "Service",
          name: p.h1.replace(/\.$/, ""),
          serviceType: p.serviceType,
          description: p.metaDescription,
          url,
          provider: { "@id": `${SITE}/#business` },
          areaServed: { "@type": "Country", name: "Scotland" },
        }),
      },
      { type: "application/ld+json", children: safeJsonLd(faqSchema(p.faqs)) },
      {
        type: "application/ld+json",
        children: safeJsonLd(breadcrumbSchema([{ name: "Home", url: "/" }, { name: p.breadcrumbLabel, url: p.path }])),
      },
    ],
  });
}
