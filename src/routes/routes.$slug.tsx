import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { getRelatedSeoLinks } from "@/lib/seo-related.functions";
import { getRouteFares } from "@/lib/seo/route-fares.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";
import { SiteLayout } from "@/components/site/SiteLayout";
import { JourneyPage, journeyHead } from "@/components/site/JourneyPage";
import { buildJourney } from "@/lib/seo/journeys";

const ORIGIN = "https://cabslink.com";

export const Route = createFileRoute("/routes/$slug")({
  loader: async ({ params }) => {
    // Code-defined, facts-gated journey pages take precedence.
    const journey = buildJourney(params.slug);
    if (journey) {
      // Journeys carry their own verified road distance/duration.
      const fares = await getRouteFares({
        data: { slug: params.slug, miles: journey.miles, minutes: journey.mins },
      }).catch(() => null);
      return { journey, page: null, related: null, fares };
    }

    const page = await getPublicSeoPageByPath({ data: { path: `/routes/${params.slug}` } });
    if (!page) throw notFound();
    // Route pages: use origin entity as the anchor for nearby links
    const entityType = page.primary_entity_type as any;
    const [related, fares] = await Promise.all([
      entityType === "location" || entityType === "airport" || entityType === "service"
        ? getRelatedSeoLinks({
            data: { entityType, entityId: page.primary_entity_id },
          }).catch(() => null)
        : Promise.resolve(null),
      // Real fares from the live pricing engine; null when the route has no
      // reliable distance, in which case the table is simply omitted.
      getRouteFares({ data: { slug: params.slug } }).catch(() => null),
    ]);
    return { journey: null, page, related, fares };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    if (loaderData.journey) return journeyHead(loaderData.journey, loaderData.fares);
    return loaderData.page
      ? buildSeoHead(loaderData.page, ORIGIN, loaderData.related, loaderData.fares)
      : {};
  },


  component: RoutePage,
  notFoundComponent: () => (
    <SiteLayout><div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Route page not found</h1>
      <p className="text-muted-foreground mt-2">This route isn't published yet.</p>
    </div></SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">{error.message}</p>
    </div></SiteLayout>
  ),
});

function RoutePage() {
  const { journey, page, related, fares } = Route.useLoaderData();
  if (journey) return <JourneyPage content={journey} fares={fares} />;
  return <SeoPageRenderer page={page!} related={related} fares={fares} />;
}


