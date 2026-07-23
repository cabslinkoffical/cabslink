import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";

const KEY = "areas" as const;

export const Route = createFileRoute("/areas/$slug")({
  head: ({ loaderData }: { loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) =>
    buildAutoHead(loaderData),
  loader: ({ params, context }: { params: { slug: string }, context: any }) => context.queryClient.ensureQueryData(destinationQueryOptions(KEY, params.slug)),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(destinationQueryOptions(KEY, slug));
  const crumbs = buildBreadcrumbs(data.destination, `/${KEY}`, HUBS[KEY].title);
  return <DestinationPage data={data} breadcrumbs={crumbs} />;
}
