import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/universities/")({
  head: () => ({ meta: [
    { title: `${HUBS[("universities" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("universities" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("universities" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("universities" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/universities" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/universities" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("universities" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("universities" as const)));
    return <HubPage title={HUBS[("universities" as const)].title} intro={HUBS[("universities" as const)].intro} longIntro={HUBS[("universities" as const)].longIntro} notes={HUBS[("universities" as const)].notes} destinations={data} contentKey={("universities" as const)} />;
  },
});
