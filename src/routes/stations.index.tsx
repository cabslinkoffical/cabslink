import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/stations/")({
  head: () => ({ meta: [
    { title: `${HUBS[("stations" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("stations" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("stations" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("stations" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/stations" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/stations" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("stations" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("stations" as const)));
    return <HubPage title={HUBS[("stations" as const)].title} intro={HUBS[("stations" as const)].intro} longIntro={HUBS[("stations" as const)].longIntro} notes={HUBS[("stations" as const)].notes} destinations={data} contentKey={("stations" as const)} />;
  },
});
