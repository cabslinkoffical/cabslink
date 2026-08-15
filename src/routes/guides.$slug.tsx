import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
export const Route = createFileRoute("/guides/$slug")({
  head: ({ loaderData }: { loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) =>
    buildAutoHead(loaderData),
  loader: ({ params, context }: { params: { slug: string }, context: any }) => context.queryClient.ensureQueryData(destinationQueryOptions(("guides" as const), params.slug)),
  component: () => {
    const { slug } = Route.useParams();
    const { data } = useSuspenseQuery(destinationQueryOptions(("guides" as const), slug));
    return <DestinationPage data={data} breadcrumbs={buildBreadcrumbs(data.destination, `/${("guides" as const)}`, HUBS[("guides" as const)].title)} />;
  },
});
