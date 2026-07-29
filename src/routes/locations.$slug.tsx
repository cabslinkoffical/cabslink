import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { getRelatedSeoLinks } from "@/lib/seo-related.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";
import { SiteLayout } from "@/components/site/SiteLayout";

const ORIGIN = "https://cabslink.lovable.app";

export const Route = createFileRoute("/locations/$slug")({
  loader: async ({ params }) => {
    const page = await getPublicSeoPageByPath({ data: { path: `/locations/${params.slug}` } });
    if (!page) throw notFound();
    const related = await getRelatedSeoLinks({
      data: { entityType: page.primary_entity_type as any, entityId: page.primary_entity_id },
    }).catch(() => null);
    return { page, related };
  },
  head: ({ loaderData }) =>
    loaderData ? buildSeoHead(loaderData.page, ORIGIN, loaderData.related) : {},
  component: LocationPage,
  notFoundComponent: () => (
    <SiteLayout><div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Location not found</h1>
      <p className="text-muted-foreground mt-2">This location isn't published yet.</p>
    </div></SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">{error.message}</p>
    </div></SiteLayout>
  ),
});

function LocationPage() {
  const { page, related } = Route.useLoaderData();
  return <SeoPageRenderer page={page} related={related} />;
}
