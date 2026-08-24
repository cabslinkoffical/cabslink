import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { regionHubQuery } from "@/lib/explore.functions";

export const Route = createFileRoute("/areas/region/$slug")({
  loader: async ({ params, context }) => {
    const hub = await context.queryClient.ensureQueryData(regionHubQuery(params.slug));
    if (!hub) throw notFound();
    return hub;
  },
  head: ({ params, loaderData }) => {
    const canonical = `https://cabslink.com/areas/region/${params.slug}`;
    const title = loaderData ? `${loaderData.name} — Cabslink Locations` : "Region";
    const desc = loaderData
      ? `Explore ${loaderData.total} destinations across ${loaderData.name} — towns, airports, stations, universities, hospitals and attractions.`
      : "Region overview.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: RegionPage,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="container-x py-24 text-center">
        <h1 className="text-3xl font-bold">Region not found</h1>
        <p className="mt-2 text-[var(--navy)]/70">
          Try the <Link to="/areas" className="underline">Locations directory</Link>.
        </p>
      </section>
    </SiteLayout>
  ),
});

function RegionPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(regionHubQuery(slug));
  if (!data) return null;

  const sections: Array<{ title: string; items: typeof data.towns }> = [
    { title: "Towns & Areas", items: data.towns },
    { title: "Airports", items: data.airports },
    { title: "Train Stations", items: data.stations },
    { title: "Universities", items: data.universities },
    { title: "Hospitals", items: data.hospitals },
    { title: "Attractions", items: data.attractions },
    { title: "Popular Routes", items: data.routes },
    { title: "Services", items: data.services },
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Region"
        title={data.name}
        subtitle={`${data.total} destinations covered across ${data.name} — airports, stations, universities, hospitals and attractions.`}
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Locations", to: "/areas" },
          { label: data.name },
        ]}
      />
      <section className="section-y">
        <div className="container-x space-y-14">
          {sections
            .filter((s) => s.items.length > 0)
            .map((s) => (
              <div key={s.title}>
                <h2 className="mb-5 font-display text-2xl md:text-3xl font-semibold text-[var(--navy)]">{s.title}</h2>
                <EntityGrid items={s.items} />
              </div>
            ))}
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Locations", href: "/areas" },
              { name: data.name, href: `/areas/region/${data.slug}` },
            ]}
          />
        </div>
      </section>
    </SiteLayout>
  );
}

