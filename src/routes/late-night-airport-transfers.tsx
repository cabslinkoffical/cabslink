import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { ServicePillarPage } from "@/components/site/ServicePillarPage";
import { pillarSchema } from "@/components/site/ServicePillarPage.head";
import { SERVICE_PILLARS } from "@/lib/seo/service-pillars";

const content = SERVICE_PILLARS["late-night-airport-transfers"]!;
const URL = "https://cabslink.com/late-night-airport-transfers";

export const Route = createFileRoute("/late-night-airport-transfers")({
  head: () => normalizeHead({
    meta: [
      { title: content.metaTitle },
      { name: "description", content: content.metaDescription },
      { property: "og:title", content: content.metaTitle },
      { property: "og:description", content: content.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(pillarSchema(content, URL)) },
    ],
  }),
  component: () => <ServicePillarPage content={content} />,
});
