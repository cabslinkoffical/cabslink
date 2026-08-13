import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Bus,
  CalendarClock,
  Check,
  Clock,
  CreditCard,
  Heart,
  Luggage,
  MapPin,
  Phone,
  Plane,
  Route as RouteIcon,
  ShieldCheck,
  Ship,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { getService } from "@/lib/seo/service-registry";
import { localPagesForService } from "@/lib/seo/service-locations";

import { SITE } from "@/lib/site";

const ICONS = {
  badge: BadgeCheck,
  briefcase: Briefcase,
  bus: Bus,
  calendar: CalendarClock,
  clock: Clock,
  card: CreditCard,
  heart: Heart,
  luggage: Luggage,
  phone: Phone,
  pin: MapPin,
  plane: Plane,
  route: RouteIcon,
  shield: ShieldCheck,
  ship: Ship,
  sparkles: Sparkles,
  users: Users,
  wallet: Wallet,
} as const;

export type PillarIcon = keyof typeof ICONS;

export type PillarContent = {
  /** Service id in the canonical registry. */
  id: string;
  eyebrow: string;
  h1: string;
  subtitle: string;
  breadcrumbLabel: string;
  metaTitle: string;
  metaDescription: string;
  image: string;
  imageAlt: string;
  intro: { title: string; body: string };
  features: { icon: PillarIcon; title: string; desc: string }[];
  steps: { title: string; desc: string }[];
  included: string[];
  /** Internal links to canonical location pages. */
  coverage: { label: string; to: string }[];
  /** Registry service ids to cross-link. */
  related: string[];
  faqs: { q: string; a: string }[];
};

export const DEFAULT_COVERAGE: { label: string; to: string }[] = [
  { label: "Edinburgh", to: "/areas/edinburgh" },
  { label: "Glasgow", to: "/areas/glasgow" },
  { label: "Aberdeen", to: "/areas/aberdeen" },
  { label: "Dundee", to: "/areas/dundee" },
  { label: "Inverness", to: "/areas/inverness" },
  { label: "Stirling", to: "/areas/stirling" },
  { label: "Perth", to: "/areas/perth" },
  { label: "St Andrews", to: "/areas/st-andrews" },
];

export function ServicePillarPage({ content }: { content: PillarContent }) {
  const localPages = localPagesForService(content.id);
  const related = content.related

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
          { label: "Services", to: "/services" },
          { label: content.breadcrumbLabel },
        ]}
      />

      {/* Trust strip */}
      <section className="bg-[var(--navy)]">
        <div className="container-x grid grid-cols-2 gap-x-6 gap-y-6 py-7 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "Licensed & insured" },
            { icon: Clock, label: "24/7 availability" },
            { icon: Wallet, label: "Fixed, all-in pricing" },
            { icon: BadgeCheck, label: "Vetted professional drivers" },
          ].map((t) => (
            <div key={t.label} className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                <t.icon className="size-4" />
              </span>
              <p className="text-sm font-semibold text-white">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Intro + features */}
      <section className="section-y">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-[var(--gold)]/10" aria-hidden />
            <img
              src={content.image}
              alt={content.imageAlt}
              width={1280}
              height={960}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[var(--shadow-elegant)]"
            />
            <div className="absolute -bottom-5 left-5 right-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--gold)]/30 bg-background/95 p-4 shadow-[var(--shadow-raised)] backdrop-blur sm:left-8 sm:right-auto sm:pr-8">
              <div>
                <p className="font-display text-xl font-semibold text-[var(--navy)]">4.7 / 5</p>
                <p className="text-xs text-muted-foreground">Rated by real travellers</p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]">
                <Sparkles className="size-5" />
              </span>
            </div>
          </div>
          <div>
            <SectionHeader eyebrow={content.eyebrow} title={content.intro.title} subtitle={content.intro.body} />
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.features.map((f) => {
                const Icon = ICONS[f.icon];
                return (
                  <li
                    key={f.title}
                    className="flex gap-4 rounded-2xl border bg-background p-4 shadow-[var(--shadow-raised)]"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-lg">
                <Link to="/book">Get a fixed price <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg">
                <Link to="/fleet">View vehicle classes</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>


      {/* How it works */}
      <section className="bg-[var(--navy)] text-[var(--navy-foreground)] section-y">
        <div className="container-x">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Four steps from enquiry to arrival
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {content.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <span className="font-display text-2xl font-semibold text-[var(--gold)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--navy-foreground)]/70">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What's included */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Included as standard" title={`What every ${content.breadcrumbLabel.toLowerCase()} booking includes`} />
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

      {/* Coverage — internal links to canonical location pages */}
      <section className="bg-muted/40 section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Coverage"
            title="Popular pickup areas"
            subtitle="We cover the whole of Scotland and run long-distance journeys UK-wide. These are the areas we're asked for most."
          />
          <ul className="mt-8 flex flex-wrap gap-3">
            {content.coverage.map((c) => (
              <li key={`${c.to}-${c.label}`}>
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
          {localPages.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-lg font-semibold">
                {content.breadcrumbLabel} by location
              </h3>
              <ul className="mt-4 flex flex-wrap gap-3">
                {localPages.map((p) => (
                  <li key={p.to}>
                    <Link
                      to={p.to}
                      className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
                    >
                      {content.breadcrumbLabel} in {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>


      {/* Related services */}
      {related.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <SectionHeader eyebrow="Related services" title="You may also need" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="bg-muted/40 section-y">
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

/** Service + FAQPage + BreadcrumbList graph for a national pillar page. */
export function pillarSchema(content: PillarContent, absoluteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: content.breadcrumbLabel,
        serviceType: content.breadcrumbLabel,
        description: content.metaDescription,
        url: absoluteUrl,
        areaServed: [
          { "@type": "Country", name: "United Kingdom" },
          { "@type": "AdministrativeArea", name: "Scotland" },
        ],
        provider: {
          "@type": "LocalBusiness",
          name: SITE.name,
          telephone: SITE.phoneUK,
          email: SITE.email,
          url: "https://cabslink.com",
          address: { "@type": "PostalAddress", streetAddress: SITE.address },
        },
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
          { "@type": "ListItem", position: 2, name: "Services", item: "https://cabslink.com/services" },
          { "@type": "ListItem", position: 3, name: content.breadcrumbLabel, item: absoluteUrl },
        ],
      },
    ],
  };
}
