import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { regionHubQuery } from "@/lib/explore.functions";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { breadcrumbSchema } from "@/components/seo/schema";

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
    const content = loaderData?.content;
    return normalizeHead({
      meta: [
        { title },
        // Indexed only when the region has enough real, region-specific
        // content (see region-content.ts); thin or non-main-market regions
        // stay noindex.
        { name: "robots", content: content?.indexable ? "index,follow" : "noindex,follow" },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        ...(loaderData
          ? [{
              type: "application/ld+json",
              children: JSON.stringify(breadcrumbSchema([
                { name: "Home", url: "/" },
                { name: "Locations", url: "/areas" },
                { name: loaderData.name, url: canonical },
              ])),
            }]
          : []),
        ...(content && content.faqs.length
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: content.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }),
          }]
        : []),
      ],
    });
  },
  component: RegionPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="container-x py-24 text-center">
        <h1 className="text-3xl font-bold">Region temporarily unavailable</h1>
        <p className="mt-2 text-[var(--navy)]/70">{error instanceof Error ? error.message : "Please try again shortly."}</p>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout cta={{ heading: <>Book a transfer <span className="text-gold">anywhere we cover</span></>, label: "Get a fixed price", trackAs: "final_cta_areas" }}>
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
    <SiteLayout cta={{ heading: <>Book a transfer <span className="text-gold">anywhere we cover</span></>, label: "Get a fixed price", trackAs: "final_cta_areas" }}>
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
      {data.content.intro.length > 0 && (
        <section className="section-y bg-background">
          <div className="container-x max-w-3xl space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">Private hire and airport transfers in {data.name}</h2>
            {data.content.intro.map((p) => (
              <p key={p} className="leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </div>
        </section>
      )}

      {data.content.routes.length > 0 && (
        <section className="section-y bg-secondary/40">
          <div className="container-x">
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">Fixed-price routes for {data.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Each route page shows the road distance, journey time and live fares by vehicle.</p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="p-3">Route</th><th className="p-3">Distance</th><th className="p-3">Time</th><th className="p-3">Via</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.routes.map((r) => (
                    <tr key={r.href} className="border-t border-border">
                      <td className="p-3 font-medium"><Link to={r.href} className="text-[var(--navy)] underline-offset-4 hover:text-[var(--gold-ink)] hover:underline">{r.label}</Link></td>
                      <td className="p-3 tabular-nums">{r.miles} miles</td>
                      <td className="p-3 tabular-nums">{r.time}</td>
                      <td className="p-3 text-muted-foreground">{r.via}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {data.content.distances.length > 0 && (
        <section className="section-y bg-background">
          <div className="container-x">
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">Distances to Edinburgh and Glasgow airports</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Estimated road distance and driving time. Your quote uses the real routed distance.</p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="p-3">Place</th><th className="p-3">Type</th><th className="p-3">Edinburgh Airport</th><th className="p-3">Glasgow Airport</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.distances.map((r) => (
                    <tr key={r.href} className="border-t border-border">
                      <td className="p-3 font-medium"><Link to={r.href} className="text-[var(--navy)] underline-offset-4 hover:text-[var(--gold-ink)] hover:underline">{r.name}</Link></td>
                      <td className="p-3 text-muted-foreground">{r.kind}</td>
                      <td className="p-3 tabular-nums">{r.edinburgh}</td>
                      <td className="p-3 tabular-nums">{r.glasgow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="section-y bg-background">
        <div className="container-x space-y-16">
          {sections
            .filter((s) => s.items.length > 0)
            .map((s, index) => (
              <section key={s.title} className="grid gap-8 border-t border-border pt-8 lg:grid-cols-[minmax(13rem,0.7fr)_2fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-ink)]">{String(index + 1).padStart(2, "0")}</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold text-foreground md:text-3xl">{s.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{s.items.length} destination{s.items.length === 1 ? "" : "s"}</p>
                </div>
                <EntityGrid items={s.items} />
              </section>
            ))}
          {data.content.faqs.length > 0 && (
            <div className="max-w-3xl border-t border-border pt-8"><FaqBlock items={data.content.faqs} /></div>
          )}
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

