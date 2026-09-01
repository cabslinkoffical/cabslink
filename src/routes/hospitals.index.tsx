import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HubPage } from "@/components/site/HubPage";
import { HUBS, hubQueryOptions } from "@/lib/hub-config";
import { hubHead } from "@/lib/seo/hub-head";
import { destinationHref, type Destination } from "@/lib/destinations.functions";

const KEY = "hospitals" as const;

export const Route = createFileRoute("/hospitals/")({
  head: ({ loaderData }) =>
    hubHead(
      KEY,
      ((loaderData ?? []) as Destination[]).map((d) => ({ name: d.display_name ?? d.name, url: destinationHref(d) })),
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQueryOptions(KEY)),
  component: () => {
    const { data } = useSuspenseQuery(hubQueryOptions(KEY));
    return (
      <HubPage
        title={HUBS[KEY].title}
        intro={HUBS[KEY].intro}
        longIntro={HUBS[KEY].longIntro}
        notes={HUBS[KEY].notes}
        destinations={data}
        contentKey={KEY}
      />
    );
  },
});
