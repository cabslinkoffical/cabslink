/** Structured data for travel-solution pages, kept apart from the page layout. */
import { getService } from "@/lib/seo/service-registry";
import { BUSINESS_ID } from "@/lib/seo/business-graph";
import type { SolutionContent } from "@/components/site/SolutionPage";

/** WebPage + FAQPage + BreadcrumbList + service ItemList graph. */
export function solutionSchema(content: SolutionContent, absoluteUrl: string) {
  const services = content.services
    .map((id) => getService(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: content.metaTitle,
        description: content.metaDescription,
        url: absoluteUrl,
        about: { "@id": BUSINESS_ID },
      },
      {
        "@type": "ItemList",
        name: `${content.breadcrumbLabel} services`,
        itemListElement: services.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.name,
          url: `https://cabslink.com${s.url}`,
        })),
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
          {
            "@type": "ListItem",
            position: 2,
            name: "Travel Solutions",
            item: "https://cabslink.com/travel-solutions",
          },
          { "@type": "ListItem", position: 3, name: content.breadcrumbLabel, item: absoluteUrl },
        ],
      },
    ],
  };
}
