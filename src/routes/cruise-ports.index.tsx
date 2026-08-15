import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/cruise-ports/")({
  head: () => ({ meta: [
    { title: `${HUBS[("cruise-ports" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("cruise-ports" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("cruise-ports" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("cruise-ports" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/cruise-ports" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/cruise-ports" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("cruise-ports" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("cruise-ports" as const)));
    return <HubPage title={HUBS[("cruise-ports" as const)].title} intro={HUBS[("cruise-ports" as const)].intro} longIntro={HUBS[("cruise-ports" as const)].longIntro} notes={HUBS[("cruise-ports" as const)].notes} destinations={data} contentKey={("cruise-ports" as const)} />;
  },
});
