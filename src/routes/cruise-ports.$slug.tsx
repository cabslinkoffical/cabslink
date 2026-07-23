import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
const KEY = "cruise-ports" as const;
export const Route = createFileRoute("/cruise-ports/$slug")({
  head: ({ loaderData }: { loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const d = loaderData.destination;
    const title = `${d.display_name ?? d.name} Cruise Port Transfers — CabsLink`;
    const desc = `Direct private transfers to ${d.display_name ?? d.name}.`;
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
