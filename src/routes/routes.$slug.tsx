import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { getRelatedSeoLinks } from "@/lib/seo-related.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";
import { SiteLayout } from "@/components/site/SiteLayout";
import { JourneyPage, journeyHead } from "@/components/site/JourneyPage";
import { buildJourney } from "@/lib/seo/journeys";

const ORIGIN = "https://cabslink.com";

export const Route = createFileRoute("/routes/$slug")({
  loader: async ({ params }) => {
    // Code-defined, facts-gated journey pages take precedence.
    const journey = buildJourney(params.slug);
    if (journey) return { journey, page: null, related: null };

    const page = await getPublicSeoPageByPath({ data: { path: `/routes/${params.slug}` } });
    if (!page) throw notFound();
    // Route pages: use origin entity as the anchor for nearby links
    const entityType = page.primary_entity_type as any;
    const related =
      entityType === "location" || entityType === "airport" || entityType === "service"
        ? await getRelatedSeoLinks({
            data: { entityType, entityId: page.primary_entity_id },
          }).catch(() => null)
        : null;
    return { journey: null, page, related };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    if (loaderData.journey) return journeyHead(loaderData.journey);
    return loaderData.page ? buildSeoHead(loaderData.page, ORIGIN, loaderData.related) : {};
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
  const { journey, page, related } = Route.useLoaderData();
  if (journey) return <JourneyPage content={journey} />;
  return <SeoPageRenderer page={page!} related={related} />;

}
