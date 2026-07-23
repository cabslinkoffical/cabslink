import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { InstantSearch } from "@/components/explore/InstantSearch";
import { AlphaBar } from "@/components/explore/AlphaBar";
import { RegionGrid } from "@/components/explore/RegionGrid";
import { CategoryGrid } from "@/components/explore/CategoryGrid";
import { EntityGrid } from "@/components/explore/EntityCard";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { exploreOverviewQuery } from "@/lib/explore.functions";

const TITLE = "Locations We Cover — UK Airport Transfers | Cabslink";
const DESC =
  "Search every city, town, airport, station, university, hospital and attraction Cabslink serves across the UK. Fixed-price private transfers, 24/7.";

export const Route = createFileRoute("/areas/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.lovable.app/areas" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/areas" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(exploreOverviewQuery()),
  component: LocationsPage,
});

function LocationsPage() {
  const { data } = useSuspenseQuery(exploreOverviewQuery());

  return (
    <main className="container-x py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Locations", href: "/areas" }]} />

      {/* Hero */}
      <section className="mt-6 rounded-3xl bg-gradient-to-br from-[var(--navy)] to-[#1a2749] px-6 py-14 text-white sm:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Locations</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Find your pickup or destination
          </h1>
          <p className="mt-3 text-white/75">
            {data.totalLocations > 0
              ? `Search ${data.totalLocations.toLocaleString()} destinations across the UK — airports, stations, universities, hospitals, attractions and more.`
              : "Search every destination Cabslink covers — airports, stations, universities, hospitals, attractions and more."}
          </p>
          <div className="mt-8 flex justify-center">
            <InstantSearch />
          </div>
        </div>
      </section>

      {data.categories.length > 0 && (
        <section className="mt-14">
          <SectionHeader eyebrow="Browse" title="By category" />
          <CategoryGrid categories={data.categories} />
        </section>
      )}

      <section className="mt-14">
        <SectionHeader eyebrow="Browse" title="By region" />
        <RegionGrid regions={data.regions} />
      </section>

      {data.popular.length > 0 && (
        <section className="mt-14">
          <SectionHeader eyebrow="Trending" title="Popular locations" />
          <EntityGrid items={data.popular} />
        </section>
      )}
      {data.popularRoutes.length > 0 && (
        <section className="mt-14">
          <SectionHeader eyebrow="Trending" title="Popular routes" />
          <EntityGrid items={data.popularRoutes} />
        </section>
      )}

      {data.letters.length > 0 && (
        <section className="mt-14">
          <SectionHeader eyebrow="Directory" title="Browse alphabetically" />
          <AlphaBar available={data.letters} />
        </section>
      )}

      <section className="mt-14">
        <FaqBlock
          items={[
            { q: "Can I book any location listed here?", a: "Yes. Every destination in the directory is instantly bookable — even ones without a dedicated page. Start on our booking page and search the same name." },
            { q: "Why don't all locations have a page?", a: "We only publish detail pages for high-value hubs. Smaller places remain fully bookable and searchable but avoid thin duplicate pages." },
            { q: "Do you cover the whole UK?", a: "Yes — we cover every UK postcode. This directory highlights named hubs, but our booking system accepts any address." },
          ]}
        />
      </section>

      <section className="mt-16 rounded-3xl border border-[var(--navy)]/10 bg-white p-8 text-center">
        <h2 className="text-2xl font-bold text-[var(--navy)]">Ready to book?</h2>
        <p className="mt-2 text-[var(--navy)]/70">Instant quote, fixed prices, professional drivers.</p>
        <Link
          to="/book"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)]"
        >
          Book a ride
        </Link>
      </section>
    </main>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-bold text-[var(--navy)] sm:text-3xl">{title}</h2>
    </div>
  );
}
