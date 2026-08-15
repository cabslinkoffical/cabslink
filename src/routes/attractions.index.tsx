import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/attractions/")({
  head: () => ({ meta: [
    { title: `${HUBS[("attractions" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("attractions" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("attractions" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("attractions" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/attractions" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/attractions" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("attractions" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("attractions" as const)));
    return <HubPage title={HUBS[("attractions" as const)].title} intro={HUBS[("attractions" as const)].intro} longIntro={HUBS[("attractions" as const)].longIntro} notes={HUBS[("attractions" as const)].notes} destinations={data} contentKey={("attractions" as const)} />;
  },
});
