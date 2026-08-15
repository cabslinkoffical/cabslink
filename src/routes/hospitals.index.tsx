import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/hospitals/")({
  head: () => ({ meta: [
    { title: `${HUBS[("hospitals" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("hospitals" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("hospitals" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("hospitals" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/hospitals" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/hospitals" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("hospitals" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("hospitals" as const)));
    return <HubPage title={HUBS[("hospitals" as const)].title} intro={HUBS[("hospitals" as const)].intro} longIntro={HUBS[("hospitals" as const)].longIntro} notes={HUBS[("hospitals" as const)].notes} destinations={data} contentKey={("hospitals" as const)} />;
  },
});
