import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InstantSearch } from "@/components/explore/InstantSearch";
import { AlphaBar } from "@/components/explore/AlphaBar";
import { RegionGrid } from "@/components/explore/RegionGrid";
import { CategoryGrid } from "@/components/explore/CategoryGrid";
import { EntityGrid } from "@/components/explore/EntityCard";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
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
      { property: "og:url", content: "https://cabslink.com/areas" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/areas" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(exploreOverviewQuery()),
  component: LocationsPage,
});

function LocationsPage() {
  const { data } = useSuspenseQuery(exploreOverviewQuery());
  const count = data.totalLocations;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Locations we cover"
        title="Find your pickup or destination"
        subtitle={
          count > 0
            ? `Search ${count.toLocaleString()} destinations across the UK — airports, stations, universities, hospitals, attractions and more.`
            : "Search every destination Cabslink covers — airports, stations, universities, hospitals, attractions and more."
        }
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Locations" }]}
      />

      {/* Search bar in a lifted card, overlapping the hero */}
      <section className="container-x -mt-10 md:-mt-14 relative z-10">
        <div className="rounded-2xl border border-[var(--navy)]/10 bg-white p-4 md:p-6 shadow-raised">
          <InstantSearch />
        </div>
      </section>

      {data.categories.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <SectionHeader eyebrow="Browse" title="By category" />
            <CategoryGrid categories={data.categories} />
          </div>
        </section>
      )}

      <section className="section-y bg-[var(--navy)]/[0.03]">
        <div className="container-x">
          <SectionHeader eyebrow="Browse" title="By region" />
          <RegionGrid regions={data.regions} />
        </div>
      </section>

      {data.popular.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <SectionHeader eyebrow="Trending" title="Popular locations" />
            <EntityGrid items={data.popular} />
          </div>
        </section>
      )}

      {data.popularRoutes.length > 0 && (
        <section className="section-y bg-[var(--navy)]/[0.03]">
          <div className="container-x">
            <SectionHeader eyebrow="Trending" title="Popular routes" />
            <EntityGrid items={data.popularRoutes} />
          </div>
        </section>
      )}

      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Coverage map" title="Where we run — and the pages for each" />
          <CoverageMap />
        </div>
      </section>

      {data.letters.length > 0 && (
        <section className="section-y bg-[var(--navy)]/[0.03]">
          <div className="container-x">
            <SectionHeader eyebrow="Directory" title="Browse alphabetically" />
            <AlphaBar available={data.letters} />
          </div>
        </section>
      )}


      <section className="section-y bg-[var(--navy)]/[0.03]">
        <div className="container-x max-w-3xl">
          <FaqBlock
            items={[
              { q: "Can I book any location listed here?", a: "Yes. Every destination in the directory is instantly bookable — even ones without a dedicated page. Start on our booking page and search the same name." },
              { q: "Why don't all locations have a page?", a: "We only publish detail pages for high-value hubs. Smaller places remain fully bookable and searchable but avoid thin duplicate pages." },
              { q: "Do you cover the whole UK?", a: "Yes — we cover every UK postcode. This directory highlights named hubs, but our booking system accepts any address." },
            ]}
          />
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Locations", href: "/areas" }]} />
        </div>
      </section>

    </SiteLayout>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl md:text-4xl font-semibold text-[var(--navy)]">{title}</h2>
    </div>
  );
}
