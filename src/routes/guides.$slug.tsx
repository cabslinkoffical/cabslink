import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { GuidePage, guideHead } from "@/components/site/GuidePage";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
import { getGuide } from "@/lib/seo/guides";

/**
 * Code-defined guides in `src/lib/seo/guides.ts` take precedence over any
 * `destinations` row with the same slug, so the hand-written long-form page
 * wins and no database query is made for it.
 */
export const Route = createFileRoute("/guides/$slug")({
  head: ({ params, loaderData }: { params: { slug: string }, loaderData?: import("@/components/site/DestinationPage").LoadedDestination }) => {
    const guide = getGuide(params.slug);
    return guide ? guideHead(guide) : buildAutoHead(loaderData);
  },
  loader: ({ params, context }: { params: { slug: string }, context: any }) => {
    if (getGuide(params.slug)) return null;
    return context.queryClient.ensureQueryData(destinationQueryOptions(("guides" as const), params.slug));
  },
  component: () => {
    const { slug } = Route.useParams();
    const guide = getGuide(slug);
    if (guide) return <GuidePage guide={guide} />;
    return <DatabaseGuide slug={slug} />;
  },
});

function DatabaseGuide({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(destinationQueryOptions(("guides" as const), slug));
  return (
    <DestinationPage
      data={data}
      breadcrumbs={buildBreadcrumbs(data.destination, `/${("guides" as const)}`, HUBS[("guides" as const)].title)}
    />
  );
}
