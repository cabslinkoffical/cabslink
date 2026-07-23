import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AreaLocationPage } from "@/components/site/AreaLocationPage";
import { areaSeoContextQuery } from "@/lib/explore.functions";
import { buildAutoHead } from "@/lib/seo/auto-seo";

export const Route = createFileRoute("/areas/$slug")({
  loader: async ({ params, context }) => {
    const ctx = await context.queryClient.ensureQueryData(areaSeoContextQuery(params.slug));
    if (!ctx) throw notFound();
    return ctx;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Location not found" }, { name: "robots", content: "noindex" }] };
    }
    // Reuse the auto-SEO head builder with a slim loaded shape.
    return buildAutoHead({
      destination: loaderData.destination,
      nearby: loaderData.nearbyAreas,
      popularRoutes: loaderData.popularRoutes,
      relatedServices: loaderData.services,
    });
  },
  component: Page,
  notFoundComponent: () => (
    <main className="container-x py-24 text-center">
      <h1 className="text-3xl font-bold">Location not found</h1>
      <p className="mt-2 text-[var(--navy)]/70">This location isn't published yet.</p>
    </main>
  ),
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(areaSeoContextQuery(slug));
  if (!data) return null;
  return <AreaLocationPage data={data} />;
}
