import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DestinationPage, buildBreadcrumbs } from "@/components/site/DestinationPage";
import { GuidePage } from "@/components/site/GuidePage";
import { guideHead } from "@/components/site/GuidePage.head";
import { buildAutoHead } from "@/lib/seo/auto-seo";
import { destinationQueryOptions, HUBS } from "@/lib/hub-config";
import { getGuide } from "@/lib/seo/guides";
import { getRouteFares } from "@/lib/seo/route-fares.functions";

/**
 * Code-defined guides in `src/lib/seo/guides.ts` take precedence over any
 * `destinations` row with the same slug, so the hand-written long-form page
 * wins and no database query is made for it.
 */
export const Route = createFileRoute("/guides/$slug")({
  head: ({ params, loaderData }: { params: { slug: string }; loaderData?: { destination: import("@/lib/destination-loader").LoadedDestination | undefined; fares: import("@/lib/seo/route-fares.functions").RouteFareTable | null } }) => {
    const guide = getGuide(params.slug);
    return guide ? guideHead(guide, loaderData?.fares) : buildAutoHead(loaderData?.destination);
  },
  loader: async ({ params, context }) => {
    if (getGuide(params.slug)) {
      const fares = params.slug === "edinburgh-airport-to-city-centre"
        ? await getRouteFares({ data: { slug: params.slug, miles: 10, minutes: 33 } }).catch(() => null)
        : null;
      return { destination: undefined, fares };
    }
    const destination = await context.queryClient.ensureQueryData(destinationQueryOptions(("guides" as const), params.slug));
    return { destination, fares: null };
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
