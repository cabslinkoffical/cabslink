import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { InstantSearch } from "@/components/explore/InstantSearch";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { regionHubQuery, type RegionHub } from "@/lib/explore.functions";

export const Route = createFileRoute("/explore/region/$slug")({
  loader: async ({ params, context }) => {
    const hub = await context.queryClient.ensureQueryData(regionHubQuery(params.slug));
    if (!hub) throw notFound();
    return hub;
  },
  head: ({ loaderData }: { loaderData?: RegionHub }) => {
    if (!loaderData) return { meta: [{ title: "Region — Cabslink" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.name} — Travel & Transfers | Cabslink`;
    const desc = `Private travel across ${loaderData.name}: towns, airports, stations, universities, hospitals and attractions with fixed-price transfers.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/explore/region/${loaderData.slug}` }],
    };
  },
  component: RegionHubPage,
  errorComponent: ({ error }) => (
    <main className="container-x py-16 text-center">
      <h1 className="text-2xl font-bold text-[var(--navy)]">Something went wrong</h1>
      <p className="mt-2 text-[var(--navy)]/70">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container-x py-16 text-center">
      <h1 className="text-2xl font-bold text-[var(--navy)]">Region not found</h1>
      <p className="mt-2 text-[var(--navy)]/70">Try the <Link to="/explore" className="underline">Locations Explorer</Link>.</p>
    </main>
  ),
});

function RegionHubPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(regionHubQuery(slug));
  if (!data) return null;
  const hub = data;

  return (
    <main className="container-x py-10">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Explore", href: "/explore" },
          { name: hub.name, href: `/explore/region/${hub.slug}` },
        ]}
      />

      <header className="mt-6 rounded-3xl bg-gradient-to-br from-[var(--navy)] to-[#1a2749] px-6 py-12 text-white sm:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Region</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{hub.name}</h1>
        <p className="mt-2 text-white/75">
          {hub.total} destination{hub.total === 1 ? "" : "s"} in {hub.name} — airports, stations, universities, hospitals, attractions and more.
        </p>
        <div className="mt-6 max-w-2xl">
          <InstantSearch placeholder={`Search in ${hub.name}…`} />
        </div>
      </header>

      <Group title="Popular towns & areas" items={hub.towns} />
      <Group title="Airports" items={hub.airports} />
      <Group title="Train stations" items={hub.stations} />
      <Group title="Universities" items={hub.universities} />
      <Group title="Hospitals" items={hub.hospitals} />
      <Group title="Attractions" items={hub.attractions} />
      <Group title="Popular routes" items={hub.routes} />
      <Group title="Related services" items={hub.services} />

      {hub.total === 0 && (
        <p className="mt-10 rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center text-[var(--navy)]/60">
          No public destinations yet in {hub.name}. Every UK postcode is still bookable — use the search or booking widget.
        </p>
      )}

      <section className="mt-14">
        <FaqBlock
          items={[
            { q: `Do you cover the whole of ${hub.name}?`, a: `Yes. We pick up and drop off at any postcode in ${hub.name}, whether or not it appears in this list.` },
            { q: "Are prices fixed?", a: "Yes — you'll see a fixed price before you confirm. No surge pricing." },
          ]}
        />
      </section>

      <section className="mt-14 rounded-3xl border border-[var(--navy)]/10 bg-white p-8 text-center">
        <h2 className="text-2xl font-bold text-[var(--navy)]">Book travel in {hub.name}</h2>
        <Link to="/book" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)]">
          Get a quote
        </Link>
      </section>
    </main>
  );
}

function Group({ title, items }: { title: string; items: RegionHub["towns"] }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-2xl font-bold text-[var(--navy)]">{title}</h2>
      <EntityGrid items={items} />
    </section>
  );
}
