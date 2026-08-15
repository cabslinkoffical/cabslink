import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
export const Route = createFileRoute("/distilleries/")({
  head: () => ({ meta: [
    { title: `${HUBS[("distilleries" as const)].title} — CabsLink` },
    { name: "description", content: HUBS[("distilleries" as const)].metaDescription },
    { property: "og:title", content: `${HUBS[("distilleries" as const)].title} — CabsLink` },
    { property: "og:description", content: HUBS[("distilleries" as const)].metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/distilleries" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/distilleries" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(("distilleries" as const))),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(("distilleries" as const)));
    return <HubPage title={HUBS[("distilleries" as const)].title} intro={HUBS[("distilleries" as const)].intro} longIntro={HUBS[("distilleries" as const)].longIntro} notes={HUBS[("distilleries" as const)].notes} destinations={data} contentKey={("distilleries" as const)} />;
  },
});
