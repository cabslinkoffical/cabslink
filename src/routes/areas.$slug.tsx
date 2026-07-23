import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";

const KEY = "areas" as const;

export const Route = createFileRoute("/areas/$slug")({
  head: ({ loaderData }: { loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const d = loaderData.destination;
    const title = `${d.display_name ?? d.name} Private Travel — CabsLink`;
    const desc = `Pre-booked private travel to and from ${d.display_name ?? d.name}${d.region ? ", " + d.region : ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(d.noindex ? [{ name: "robots", content: "noindex" }] : []),
      ],
    };
  },
  loader: ({ params, context }: { params: { slug: string }, context: any }) => context.queryClient.ensureQueryData(destinationQueryOptions(KEY, params.slug)),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(destinationQueryOptions(KEY, slug));
  const crumbs = buildBreadcrumbs(data.destination, `/${KEY}`, HUBS[KEY].title);
  return <DestinationPage data={data} breadcrumbs={crumbs} />;
}
