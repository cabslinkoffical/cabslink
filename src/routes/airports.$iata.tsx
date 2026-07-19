import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { getRelatedSeoLinks } from "@/lib/seo-related.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";

const ORIGIN = "https://cabslink.lovable.app";

export const Route = createFileRoute("/airports/$iata")({
  loader: async ({ params }) => {
    const page = await getPublicSeoPageByPath({ data: { path: `/airports/${params.iata.toLowerCase()}` } });
    if (!page) throw notFound();
    const related = await getRelatedSeoLinks({
      data: { entityType: page.primary_entity_type as any, entityId: page.primary_entity_id },
    }).catch(() => null);
    return { page, related };
  },
  head: ({ loaderData }) =>
    loaderData ? buildSeoHead(loaderData.page, ORIGIN, loaderData.related) : {},
  component: AirportPage,
  notFoundComponent: () => (
    <main className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Airport page not found</h1>
      <p className="text-muted-foreground mt-2">This airport transfer page isn't published yet.</p>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">{error.message}</p>
    </main>
  ),
});

function AirportPage() {
  const { page, related } = Route.useLoaderData();
  return <SeoPageRenderer page={page} related={related} />;
}
