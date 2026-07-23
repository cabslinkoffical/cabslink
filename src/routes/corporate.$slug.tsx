import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
const KEY = "corporate" as const;
export const Route = createFileRoute("/corporate/$slug")({
  head: ({ loaderData }: { loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) =>
    buildAutoHead(loaderData),
  loader: ({ params, context }: { params: { slug: string }, context: any }) => context.queryClient.ensureQueryData(destinationQueryOptions(KEY, params.slug)),
  component: () => {
    const { slug } = Route.useParams();
    const { data } = useSuspenseQuery(destinationQueryOptions(KEY, slug));
    return <DestinationPage data={data} breadcrumbs={buildBreadcrumbs(data.destination, `/${KEY}`, HUBS[KEY].title)} />;
  },
});
