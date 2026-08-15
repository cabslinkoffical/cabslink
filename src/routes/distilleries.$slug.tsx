import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
export const Route = createFileRoute("/distilleries/$slug")({
  head: ({ loaderData }: { loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) =>
    buildAutoHead(loaderData),
  loader: ({ params, context }: { params: { slug: string }, context: any }) => context.queryClient.ensureQueryData(destinationQueryOptions(("distilleries" as const), params.slug)),
  component: () => {
    const { slug } = Route.useParams();
    const { data } = useSuspenseQuery(destinationQueryOptions(("distilleries" as const), slug));
    return <DestinationPage data={data} breadcrumbs={buildBreadcrumbs(data.destination, `/${("distilleries" as const)}`, HUBS[("distilleries" as const)].title)} />;
  },
});
