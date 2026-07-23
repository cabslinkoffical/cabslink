import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { regionHubQuery } from "@/lib/explore.functions";

export const Route = createFileRoute("/areas/region/$slug")({
  loader: async ({ params, context }) => {
    const hub = await context.queryClient.ensureQueryData(regionHubQuery(params.slug));
    if (!hub) throw notFound();
    return hub;
  },
  head: ({ loaderData }) => {
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
      ],
    };
  },
  component: RegionPage,
  notFoundComponent: () => (
    <main className="container-x py-24 text-center">
      <h1 className="text-3xl font-bold">Region not found</h1>
      <p className="mt-2 text-[var(--navy)]/70">
        Try the <Link to="/areas" className="underline">Locations directory</Link>.
      </p>
    </main>
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
    <main className="container-x py-10">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Locations", href: "/areas" },
          { name: data.name, href: `/areas/region/${data.slug}` },
        ]}
      />
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">Region</p>
        <h1 className="mt-2 text-4xl font-bold text-[var(--navy)] sm:text-5xl">{data.name}</h1>
        <p className="mt-2 text-[var(--navy)]/70">
          {data.total} destinations covered across {data.name}.
        </p>
      </header>

      <div className="mt-10 space-y-12">
        {sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.title}>
              <h2 className="mb-4 text-2xl font-bold text-[var(--navy)]">{s.title}</h2>
              <EntityGrid items={s.items} />
            </section>
          ))}
      </div>
    </main>
  );
}
