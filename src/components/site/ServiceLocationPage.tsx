/**
 * ServiceLocationPage — shared template for service + location combination
 * pages (e.g. /airport-transfers/edinburgh). Content is facts-gated in
 * src/lib/seo/service-locations.ts; this file only renders it.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Phone, Plane, Route as RouteIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { getService } from "@/lib/seo/service-registry";
import type { ServiceLocationContent } from "@/lib/seo/service-locations";
import { InternalLinkHub } from "@/components/seo/InternalLinkHub";
import { SITE } from "@/lib/site";

export function ServiceLocationPage({ content }: { content: ServiceLocationContent }) {
  const loc = content.location;
  const related = content.related
    .map((id) => getService(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SiteLayout>
      <PageHero
        eyebrow={`${content.eyebrow} — ${loc.name}`}
        title={content.h1}
        subtitle={content.subtitle}
        primaryLabel="Get a fixed price"
        primaryTo="/book"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: content.serviceName, to: content.serviceUrl },
          { label: loc.name },
        ]}
      />

      {/* Local intro + facts */}
      <section className="section-y">
        <div className="container-x grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeader
              eyebrow={`${loc.name}, ${loc.region}`}
              title={`${content.serviceName} for ${loc.name} travellers`}
              subtitle={content.intro}
            />
            <p className="speakable mt-6 text-sm leading-relaxed text-muted-foreground">{loc.orientation}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{content.localNote}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-lg">
                <Link to="/book">Book online <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg">
                <Link to="/areas/$slug" params={{ slug: loc.slug }}>About {loc.name}</Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-3xl border bg-background p-6 shadow-[var(--shadow-raised)]">
            <h2 className="font-display text-lg font-semibold">Airport drive times from {loc.name}</h2>
            <ul className="mt-4 space-y-3">
              {loc.airports.map((a) => (
                <li key={a.code} className="flex items-start gap-3 text-sm">
                  <Plane className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                  <span>
                    <span className="font-medium">{a.name}</span>
                    <span className="block text-muted-foreground">
                      {a.miles} miles · about {a.mins} minutes
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-display text-lg font-semibold">Key pickup points</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {loc.landmarks.map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {l}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Popular journeys */}
      <section className="bg-[var(--navy)] text-[var(--navy-foreground)] section-y">
        <div className="container-x">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Popular journeys</p>
          <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Routes we run from {loc.name}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {loc.journeys.map((j) => (
              <li key={j.to} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <RouteIcon className="size-5 text-[var(--gold)]" />
                <h3 className="mt-3 font-semibold">
                  {loc.name} → {j.to}
                </h3>
                <p className="mt-2 text-sm text-[var(--navy-foreground)]/70">{j.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Local logistics + included */}
      <section className="section-y">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Local knowledge" title={`How pickups work in ${loc.name}`} />
            <ul className="mt-6 space-y-4">
              {loc.logistics.map((l) => (
                <li key={l} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {l}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow="Included as standard" title="What your booking includes" />
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {content.included.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border bg-background p-4 text-sm font-medium shadow-[var(--shadow-raised)]"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Other services in this location + national pillar */}
      <section className="bg-muted/40 section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="More in this area"
            title={`Other travel services in ${loc.name}`}
            subtitle={`Every ${loc.name} page links back to the national service if you need the full detail.`}
          />
          <ul className="mt-8 flex flex-wrap gap-3">
            {content.siblings.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
                >
                  <MapPin className="size-4 text-[var(--gold-ink)]" /> {s.label} in {loc.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to={content.serviceUrl}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
              >
                {content.serviceName} across the UK <ArrowRight className="size-4" />
              </Link>
            </li>
          </ul>

          {related.length > 0 && (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((s) => (
                <li key={s.id}>
                  <Link
                    to={s.url}
                    className="group flex h-full flex-col rounded-2xl border bg-background p-6 shadow-[var(--shadow-raised)] transition hover:border-[var(--gold)]"
                  >
                    <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.intent}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--gold-ink)]">
                      Learn more <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Automated services ↔ airports ↔ locations cross-links */}
      <section className="section-y bg-muted/40">
        <div className="container-x">
          <InternalLinkHub kind="location" slug={loc.slug} className="" heading={`More travel options in ${loc.name}`} />
        </div>
      </section>

      {/* FAQs */}
      <section className="section-y">
        <div className="container-x max-w-3xl">
          <SectionHeader eyebrow="FAQs" title={`${content.serviceName} in ${loc.name} — questions`} />
          <div className="mt-8 space-y-6">
            {content.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="gold" className="rounded-lg">
              <Link to="/book">Get a quote</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg">
              <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>
                <Phone className="size-4" /> {SITE.phoneUK}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

const ORIGIN = "https://cabslink.com";

/** Service + FAQPage + BreadcrumbList graph for a combination page. */
export function serviceLocationSchema(content: ServiceLocationContent) {
  const url = `${ORIGIN}${content.canonicalPath}`;
  const loc = content.location;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: `${content.serviceName} in ${loc.name}`,
        serviceType: content.serviceName,
        description: content.metaDescription,
        url,
        provider: { "@type": "Organization", name: "Cabslink", url: ORIGIN },
        areaServed: { "@type": "City", name: loc.name, containedInPlace: { "@type": "AdministrativeArea", name: loc.region } },
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
          { "@type": "ListItem", position: 2, name: content.serviceName, item: `${ORIGIN}${content.serviceUrl}` },
          { "@type": "ListItem", position: 3, name: loc.name, item: url },
        ],
      },
    ],
  };
}

/** head() payload for a combination route. */
export function serviceLocationHead(content: ServiceLocationContent) {
  const url = `${ORIGIN}${content.canonicalPath}`;
  return {
    meta: [
      { title: content.metaTitle },
      { name: "description", content: content.metaDescription },
      { property: "og:title", content: content.metaTitle },
      { property: "og:description", content: content.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(serviceLocationSchema(content)) },
    ],
  };
}
