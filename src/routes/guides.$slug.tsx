import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
const KEY = "guides" as const;
export const Route = createFileRoute("/guides/$slug")({
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const d = loaderData.destination;
    const title = `${d.display_name ?? d.name} — Travel Guide | CabsLink`;
    const desc = `Guide to travelling in ${d.display_name ?? d.name}${d.region ? ", " + d.region : ""}.`;
    return { meta: [
      { title }, { name: "description", content: desc },
      { property: "og:title", content: title }, { property: "og:description", content: desc },
      ...(d.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ] };
  },
  loader: ({ params, context }: { params: { slug: string }, context: any }) => context.queryClient.ensureQueryData(destinationQueryOptions(KEY, params.slug)),
  component: () => {
    const { slug } = Route.useParams();
    const { data } = useSuspenseQuery(destinationQueryOptions(KEY, slug));
    return <DestinationPage data={data} breadcrumbs={buildBreadcrumbs(data.destination, `/${KEY}`, HUBS[KEY].title)} />;
  },
});
