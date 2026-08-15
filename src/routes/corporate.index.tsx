import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/corporate/")({
  head: () => ({ meta: [
    { title: `${HUBS[("corporate" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("corporate" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("corporate" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("corporate" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/corporate" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/corporate" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("corporate" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("corporate" as const)));
    return <HubPage title={HUBS[("corporate" as const)].title} intro={HUBS[("corporate" as const)].intro} longIntro={HUBS[("corporate" as const)].longIntro} notes={HUBS[("corporate" as const)].notes} destinations={data} contentKey={("corporate" as const)} />;
  },
});
