import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/guides/")({
  head: () => ({ meta: [
    { title: `${HUBS[("guides" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("guides" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("guides" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("guides" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/guides" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/guides" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("guides" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("guides" as const)));
    return <HubPage title={HUBS[("guides" as const)].title} intro={HUBS[("guides" as const)].intro} longIntro={HUBS[("guides" as const)].longIntro} notes={HUBS[("guides" as const)].notes} destinations={data} contentKey={("guides" as const)} />;
  },
});
