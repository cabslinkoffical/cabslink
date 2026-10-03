import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InstantSearch } from "@/components/explore/InstantSearch";
import { AlphaBar } from "@/components/explore/AlphaBar";
import { RegionGrid } from "@/components/explore/RegionGrid";
import { CategoryGrid } from "@/components/explore/CategoryGrid";
import { EntityGrid } from "@/components/explore/EntityCard";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { CoverageMap } from "@/components/seo/CoverageMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SiteLayout } from "@/components/site/SiteLayout";
import { ArrowDown } from "lucide-react";
import { exploreOverviewQuery } from "@/lib/explore.functions";
import { collectionPageSchema } from "@/components/seo/schema";

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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          collectionPageSchema({
            name: TITLE,
            description: DESC,
            url: "/areas",
            breadcrumbs: [{ name: "Home", url: "/" }, { name: "Locations", url: "/areas" }],
          }),
        ),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(exploreOverviewQuery()),
  component: LocationsPage,
});

function LocationsPage() {
  const { data } = useSuspenseQuery(exploreOverviewQuery());
  const count = data.totalLocations;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div className="container-x py-16 md:py-24 lg:py-28">
          <nav className="mb-10 flex justify-center gap-2 text-xs uppercase tracking-[0.16em] text-navy-foreground/50">
            <Link to="/" className="transition hover:text-gold">Home</Link><span>/</span><span className="text-navy-foreground">Locations</span>
          </nav>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">Explore our reach</p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] md:text-7xl">Areas we cover</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-navy-foreground/70 md:text-lg">
              {count > 0
                ? `Search ${count.toLocaleString()} destinations across the UK — airports, stations, universities, hospitals, attractions and more.`
                : "Search every destination Cabslink covers — airports, stations, universities, hospitals, attractions and more."}
            </p>
            <div className="mx-auto mt-10 max-w-3xl text-left">
              <InstantSearch placeholder="Where would you like to travel?" />
            </div>
          </div>
          <a href="#coverage" aria-label="Explore coverage" className="mx-auto mt-12 grid size-10 place-items-center border border-navy-foreground/20 text-navy-foreground/65 transition hover:border-gold hover:text-gold">
            <ArrowDown className="size-4" />
          </a>
        </div>
      </section>

      <section id="coverage" className="section-y">
        <div className="container-x">
          <EditorialHeader index="01" eyebrow="Coverage map" title="Where we run" subtitle="Dozens of fixed-price journeys connect the UK's key cities, airports, and regional destinations." />
          <CoverageMap />
        </div>
      </section>

      <section className="section-y bg-surface-2">
        <div className="container-x">
          <EditorialHeader index="02" eyebrow="Browse" title="Explore our coverage" subtitle="Choose how you want to navigate the network." />
          <Tabs defaultValue="category" className="mt-10">
            <TabsList className="h-auto rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="category" className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
                By category
              </TabsTrigger>
              <TabsTrigger value="region" className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
                By region
              </TabsTrigger>
            </TabsList>
            <TabsContent value="category" className="mt-6">
              <CategoryGrid categories={data.categories} />
            </TabsContent>
            <TabsContent value="region" className="mt-6">
              <RegionGrid regions={data.regions} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {data.popularRoutes.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <EditorialHeader index="03" eyebrow="Journeys" title="Popular routes" />
            <EntityGrid items={data.popularRoutes} />
          </div>
        </section>
      )}

      {data.letters.length > 0 && (
        <section className="section-y bg-navy text-navy-foreground">
          <div className="container-x">
            <div className="mb-10 grid gap-6 border-b border-navy-foreground/15 pb-8 md:grid-cols-[1fr_2fr] md:items-end">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">04 / Directory</p>
              <h2 className="font-display text-3xl font-semibold md:text-5xl">Browse alphabetically</h2>
            </div>
            <AlphaBar available={data.letters} />
          </div>
        </section>
      )}


      <section className="section-y bg-surface-2">
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

    </SiteLayout>
  );
}

function EditorialHeader({ index, eyebrow, title, subtitle }: { index: string; eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-10 grid gap-5 border-b border-border pb-8 md:grid-cols-[1fr_2fr] md:items-end">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">{index} / {eyebrow}</div>
      <div>
        <h2 className="font-display text-3xl font-semibold text-foreground md:text-5xl">{title}</h2>
        {subtitle && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
