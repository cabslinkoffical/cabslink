import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";

const ORIGIN = "https://cabslink.lovable.app";

export const Route = createFileRoute("/routes/$slug")({
  loader: async ({ params }) => {
    const page = await getPublicSeoPageByPath({ data: { path: `/routes/${params.slug}` } });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => (loaderData ? buildSeoHead(loaderData.page, ORIGIN) : {}),
  component: RoutePage,
  notFoundComponent: () => (
    <main className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Route page not found</h1>
      <p className="text-muted-foreground mt-2">This route isn't published yet.</p>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">{error.message}</p>
    </main>
  ),
});

function RoutePage() {
  const { page } = Route.useLoaderData();
  return <SeoPageRenderer page={page} />;
}
