import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
const KEY = "attractions" as const;
export const Route = createFileRoute("/attractions/")({
  head: () => ({ meta: [
    { title: `${HUBS[KEY].title} — CabsLink` },
    { name: "description", content: HUBS[KEY].intro },
    { property: "og:title", content: `${HUBS[KEY].title} — CabsLink` },
    { property: "og:description", content: HUBS[KEY].intro },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cabslink.com/attractions" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://cabslink.com/attractions" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(KEY)),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(KEY));
    return <HubPage title={HUBS[KEY].title} intro={HUBS[KEY].intro} destinations={data} />;
  },
});
