/**
 * SolutionPage — shared template for customer-need pages under
 * /travel-solutions. These pages target "who you are / what you need"
 * intent (business, student, family, group, event) and route the visitor
 * into the canonical service pillars from the service registry.
 * They never restate service identity — that lives in service-registry.ts.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Phone, Quote } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { getService } from "@/lib/seo/service-registry";
import { SITE } from "@/lib/site";

export type SolutionContent = {
  /** URL slug under /travel-solutions. */
  slug: string;
  eyebrow: string;
  h1: string;
  subtitle: string;
  breadcrumbLabel: string;
  /** Short label + one-liner used on the hub grid. */
  hubTitle: string;
  hubBlurb: string;
  metaTitle: string;
  metaDescription: string;
  image: string;
  imageAlt: string;
  intro: { title: string; body: string };
  /** The specific problem → the way we solve it. */
  needs: { need: string; answer: string }[];
  /** Registry service ids that serve this need, in priority order. */
  services: string[];
  included: string[];
  coverage: { label: string; to: string }[];
  faqs: { q: string; a: string }[];
};

export function SolutionPage({ content }: { content: SolutionContent }) {
  const services = content.services
    .map((id) => getService(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SiteLayout>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.h1}
        subtitle={content.subtitle}
        primaryLabel="Get a quote"
        primaryTo="/book"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Travel solutions", to: "/travel-solutions" },
          { label: content.breadcrumbLabel },
        ]}
      />

      {/* Intro + needs */}
      <section className="section-y">
        <div className="container-x grid items-start gap-12 lg:grid-cols-2">
          <img
            src={content.image}
            alt={content.imageAlt}
            width={1280}
            height={960}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[var(--shadow-elegant)]"
          />
          <div>
            <SectionHeader
              eyebrow={content.eyebrow}
              title={content.intro.title}
              subtitle={content.intro.body}
            />
            <dl className="mt-6 space-y-5">
              {content.needs.map((n) => (
                <div key={n.need} className="rounded-2xl border bg-background p-5 shadow-[var(--shadow-raised)]">
                  <dt className="flex items-start gap-3 font-semibold">
                    <Quote className="mt-1 size-4 shrink-0 text-[var(--gold-ink)]" />
                    {n.need}
                  </dt>
                  <dd className="mt-2 pl-7 text-sm text-muted-foreground">{n.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Services that serve this need */}
      {services.length > 0 && (
        <section className="bg-[var(--navy)] text-[var(--navy-foreground)] section-y">
          <div className="container-x">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Services you'll use</p>
            <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              The right service for {content.breadcrumbLabel.toLowerCase()}
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    to={s.url}
                    className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[var(--gold)]"
                  >
                    <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-[var(--navy-foreground)]/70">{s.intent}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--gold)]">
                      View service <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Included */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Included as standard" title="What you get on every booking" />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>

      {/* Coverage */}
      <section className="bg-muted/40 section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Coverage"
            title="Where we collect from most"
            subtitle="Scotland-wide coverage with long-distance journeys across the UK."
          />
          <ul className="mt-8 flex flex-wrap gap-3">
            {content.coverage.map((c) => (
              <li key={c.to}>
                <Link
                  to={c.to}
                  className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
                >
                  <MapPin className="size-4 text-[var(--gold-ink)]" /> {c.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Can't see your town?{" "}
            <Link to="/areas" className="font-medium text-[var(--gold-ink)] underline">
              Browse every area we cover
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section className="section-y">
        <div className="container-x max-w-3xl">
          <SectionHeader eyebrow="FAQs" title="Common questions" />
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
              <Link to="/book">Book online</Link>
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

/** WebPage + FAQPage + BreadcrumbList + service ItemList graph. */
export function solutionSchema(content: SolutionContent, absoluteUrl: string) {
  const services = content.services
    .map((id) => getService(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: content.metaTitle,
        description: content.metaDescription,
        url: absoluteUrl,
        about: {
          "@type": "LocalBusiness",
          name: SITE.name,
          telephone: SITE.phoneUK,
          email: SITE.email,
          url: "https://cabslink.com",
          address: { "@type": "PostalAddress", streetAddress: SITE.address },
        },
      },
      {
        "@type": "ItemList",
        name: `${content.breadcrumbLabel} services`,
        itemListElement: services.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.name,
          url: `https://cabslink.com${s.url}`,
        })),
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
          { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Travel Solutions",
            item: "https://cabslink.com/travel-solutions",
          },
          { "@type": "ListItem", position: 3, name: content.breadcrumbLabel, item: absoluteUrl },
        ],
      },
    ],
  };
}
