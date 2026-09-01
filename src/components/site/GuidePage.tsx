/**
 * GuidePage — renderer for the code-defined editorial guides in
 * `src/lib/seo/guides.ts`. Content is hand-verified there; this file only
 * presents it.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bus, Car, Clock, Info, MapPin, Ruler, Ticket } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { TransportComparison } from "@/components/seo/TransportComparison";
import type { GuideRecord } from "@/lib/seo/guides";

const ORIGIN = "https://cabslink.com";

function formatChecked(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function GuidePage({ guide: g }: { guide: GuideRecord }) {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Travel guide"
        title={g.h1}
        subtitle={g.intro[0]}
        primaryLabel="Get a fixed price"
        primaryTo="/book"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Travel guides", to: "/guides" },
          { label: g.cardTitle },
        ]}
      />

      <section className="section-y">
        <div className="container-x max-w-3xl space-y-5">
          {g.intro.slice(1).map((p) => (
            <p key={p} className="text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Prices, admissions and timetables in this guide were checked on{" "}
              {formatChecked(g.lastChecked)} and are the operator's or attraction's own published
              figures. They change — confirm before you travel.
            </span>
          </p>
        </div>
      </section>

      {g.comparison && (
        <section className="section-y border-t">
          <div className="container-x max-w-5xl">
            <TransportComparison data={g.comparison} routeName={g.cardTitle} />
          </div>
        </section>
      )}

      {g.dayTrips && g.dayTrips.length > 0 && (
        <section className="section-y border-t">
          <div className="container-x">
            <SectionHeader
              eyebrow={`${g.dayTrips.length} day trips`}
              title="Where to go, and how to get there"
              subtitle="Distances are by road from central Edinburgh. Public transport notes are honest: where the train or bus is the better option, it says so."
            />
            <ul className="mt-10 grid gap-6 lg:grid-cols-2">
              {g.dayTrips.map((t, i) => (
                <li
                  key={t.name}
                  className="flex flex-col rounded-2xl border bg-background p-6 shadow-[var(--shadow-raised)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-xl font-semibold">
                      <span className="mr-2 text-sm text-[var(--gold-ink)]">{i + 1}.</span>
                      {t.name}
                    </h3>
                    <span className="shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {t.timeNeeded}
                    </span>
                  </div>
                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Ruler className="size-3.5" /> {t.miles} miles
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {t.driveTime} by car
                    </div>
                    {t.admission && (
                      <div className="flex items-center gap-1">
                        <Ticket className="size-3.5" /> {t.admission}
                      </div>
                    )}
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.whatsThere}</p>
                  <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <Bus className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                    <span>{t.publicTransport}</span>
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 pt-1">
                    {t.tourSlug && (
                      <Link
                        to="/tours/$slug"
                        params={{ slug: t.tourSlug }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gold-ink)] hover:underline"
                      >
                        <MapPin className="size-4" /> Our tour that goes here
                      </Link>
                    )}
                    {t.routeSlug && (
                      <Link
                        to="/routes/$slug"
                        params={{ slug: t.routeSlug }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gold-ink)] hover:underline"
                      >
                        <Car className="size-4" /> Transfer prices
                      </Link>
                    )}
                    {t.source && (
                      <a
                        href={t.source}
                        target="_blank"
                        rel="noopener nofollow"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
                      >
                        Source
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {g.sections?.map((s) => (
        <section key={s.heading} className="section-y border-t">
          <div className="container-x max-w-3xl">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">{s.heading}</h2>
            <div className="mt-5 space-y-4">
              {s.body.map((p) => (
                <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
            {s.bullets && s.bullets.length > 0 && (
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      {g.faqs.length > 0 && (
        <section className="section-y border-t">
          <div className="container-x max-w-3xl">
            <SectionHeader eyebrow="FAQs" title="Common questions" />
            <div className="mt-8 space-y-6">
              {g.faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {g.related && g.related.length > 0 && (
        <section className="bg-muted/40 section-y">
          <div className="container-x">
            <SectionHeader eyebrow="Keep reading" title="Related pages" />
            <ul className="mt-8 flex flex-wrap gap-3">
              {g.related.map((r) => (
                <li key={r.to}>
                  <Link
                    to={r.to}
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
                  >
                    {r.label} <ArrowRight className="size-4 text-[var(--gold-ink)]" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild variant="gold" className="rounded-lg">
                <Link to="/book">Get a fixed price</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}

export function guideSchema(g: GuideRecord) {
  const url = `${ORIGIN}/guides/${g.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.metaTitle,
        description: g.metaDescription,
        url,
        dateModified: g.lastChecked,
        author: { "@type": "Organization", name: "Cabslink", url: ORIGIN },
        publisher: { "@type": "Organization", name: "Cabslink", url: ORIGIN },
      },
      ...(g.dayTrips && g.dayTrips.length
        ? [
            {
              "@type": "ItemList",
              name: g.cardTitle,
              itemListElement: g.dayTrips.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.name,
                item: {
                  "@type": "TouristAttraction",
                  name: t.name,
                  description: t.whatsThere,
                },
              })),
            },
          ]
        : []),
      ...(g.faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: g.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
          { "@type": "ListItem", position: 2, name: "Travel guides", item: `${ORIGIN}/guides` },
          { "@type": "ListItem", position: 3, name: g.cardTitle, item: url },
        ],
      },
    ],
  };
}

export function guideHead(g: GuideRecord) {
  const url = `${ORIGIN}/guides/${g.slug}`;
  return {
    meta: [
      { title: g.metaTitle },
      { name: "description", content: g.metaDescription },
      { property: "og:title", content: g.metaTitle },
      { property: "og:description", content: g.metaDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...(g.review ? [{ name: "robots", content: "noindex,follow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(guideSchema(g)) }],
  };
}
