import { createFileRoute } from "@tanstack/react-router";
import { ServicePillarPage, pillarSchema } from "@/components/site/ServicePillarPage";
import { SERVICE_PILLARS } from "@/lib/seo/service-pillars";

const content = SERVICE_PILLARS["coach-hire"]!;
const URL = "https://cabslink.com/coach-hire";

export const Route = createFileRoute("/coach-hire")({
  head: () => ({
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
