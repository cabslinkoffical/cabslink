import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";

export type SportsServiceContent = {
  eyebrow: string;
  h1: string;
  subtitle: string;
  breadcrumbLabel: string;
  image: string;
  imageAlt: string;
  intro: { title: string; body: string };
  features: { icon: LucideIcon; title: string; desc: string }[];
  venues: { title: string; venues: string[] };
  faqs: { q: string; a: string }[];
};

export function SportsServicePage({ content }: { content: SportsServiceContent }) {
  return (
    <SiteLayout>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.h1}
        subtitle={content.subtitle}
        primaryLabel="Get a quote"
        primaryTo="/contact"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Services", to: "/services" },
          { label: content.breadcrumbLabel },
        ]}
      />

      <section className="section-y">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <img
            src={content.image}
            alt={content.imageAlt}
            width={1280}
            height={960}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[var(--shadow-elegant)]"
          />
          <div>
            <SectionHeader eyebrow={content.eyebrow} title={content.intro.title} subtitle={content.intro.body} />
            <ul className="mt-6 space-y-4">
              {content.features.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]">
                    <f.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-lg">
                <Link to="/contact">Request a quote <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg">
                <Link to="/fleet">View vehicle classes</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Where we travel" title={content.venues.title} />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {content.venues.venues.map((v) => (
              <li key={v} className="flex items-center gap-3 rounded-xl border bg-background p-4 text-sm font-medium shadow-[var(--shadow-raised)]">
                <Check className="size-4 shrink-0 text-[var(--gold-ink)]" /> {v}
              </li>
            ))}
          </ul>
        </div>
      </section>

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
        </div>
      </section>
    </SiteLayout>
  );
}

export function sportsFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
