import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Route as RouteIcon, Ruler } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { populatedCategories, journeyPath, JOURNEYS } from "@/lib/seo/journeys";

const ORIGIN = "https://cabslink.com";
const TITLE = "Popular UK Routes — Fixed-Price Private Transfers | Cabslink";
const DESCRIPTION =
  "Cabslink's most-booked UK journeys — airport runs, city transfers, golf and Highland routes with real distances and fixed prices.";

export const Route = createFileRoute("/routes/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${ORIGIN}/routes` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${ORIGIN}/routes` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Popular Cabslink routes",
          itemListElement: JOURNEYS.map((j, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${j.from.name} to ${j.to.name}`,
            url: `${ORIGIN}${journeyPath(j.slug)}`,
          })),
        }),
      },
    ],
  }),
  component: RoutesHub,
});

function RoutesHub() {
  const categories = populatedCategories();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Popular routes"
        title="The journeys we run most."
        subtitle="Real road distances, realistic door-to-door times and a price fixed before you travel — not a meter."
        primaryLabel="Get a fixed price"
        primaryTo="/book"
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Popular routes" }]}
      />

      {categories.map((cat, idx) => (
        <section key={cat.id} className={idx % 2 === 1 ? "bg-muted/40 section-y" : "section-y"}>
          <div className="container-x">
            <SectionHeader eyebrow={`${cat.journeys.length} journeys`} title={cat.label} subtitle={cat.blurb} />
            <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cat.journeys.map((j) => (
                <li key={j.slug}>
                  <Link
                    to={journeyPath(j.slug)}
                    className="group flex h-full flex-col rounded-2xl border bg-background p-6 shadow-[var(--shadow-raised)] transition hover:border-[var(--gold)]"
                  >
                    <RouteIcon className="size-5 text-[var(--gold-ink)]" />
                    <h3 className="mt-3 font-display text-lg font-semibold">
                      {j.from.name} → {j.to.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">Via {j.via}.</p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="size-3.5 text-[var(--gold-ink)]" /> {j.miles} miles
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5 text-[var(--gold-ink)]" />
                        {Math.floor(j.mins / 60) > 0 ? `${Math.floor(j.mins / 60)}h ` : ""}
                        {j.mins % 60 ? `${j.mins % 60}m` : ""}
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--gold-ink)]">
                      View journey <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </SiteLayout>
  );
}
