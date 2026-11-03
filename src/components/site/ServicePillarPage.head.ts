/** Structured data for national service pages, kept apart from the page layout. */
import { BUSINESS_ID } from "@/lib/seo/business-graph";
import type { PillarContent } from "@/components/site/ServicePillarPage";

/** Service + FAQPage + BreadcrumbList graph for a national pillar page. */
export function pillarSchema(content: PillarContent, absoluteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: content.breadcrumbLabel,
        serviceType: content.breadcrumbLabel,
        description: content.metaDescription,
        url: absoluteUrl,
        areaServed: [
          { "@type": "Country", name: "United Kingdom" },
          { "@type": "AdministrativeArea", name: "Scotland" },
        ],
        provider: { "@id": BUSINESS_ID },
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
          { "@type": "ListItem", position: 2, name: "Services", item: "https://cabslink.com/services" },
          { "@type": "ListItem", position: 3, name: content.breadcrumbLabel, item: absoluteUrl },
        ],
      },
    ],
  };
}
