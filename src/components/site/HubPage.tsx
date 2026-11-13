/**
 * Shared hub renderer — lists all Tier 1/2 destinations of a given type.
 */
import { Link } from "@tanstack/react-router";
import type { HubDestination, DestinationType } from "@/lib/destinations.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FaqSection, LongFormSections } from "@/components/site/ContentSections";
import { PageHero } from "@/components/site/PageHero";
import { DestinationCard } from "@/components/site/DestinationCard";
import { PageBand } from "@/components/site/PageBand";
import { HUB_CONTENT } from "@/lib/hub-content";

export function HubPage({
  title,
  intro,
  longIntro,
  notes,
  destinations,
  contentKey,
  featured,
  notesAfterDestinations = false,
  eyebrow = "Destinations",
}: {
  title: string;
  intro: string;
  longIntro?: string;
  notes?: { title: string; body: string }[];
  destinations: HubDestination[];
  type?: DestinationType;
  /** Key into HUB_CONTENT for the long-form prose + FAQ blocks. */
  contentKey?: string;
  /** Hand-written pages promoted above the destination grid. */
  featured?: { title: string; blurb: string; href: string }[];
  notesAfterDestinations?: boolean;
  eyebrow?: string;
}) {

  const content = contentKey ? HUB_CONTENT[contentKey] : undefined;
  const grouped = new Map<string, HubDestination[]>();
  for (const d of destinations) {
    const key = d.region ?? "United Kingdom";
    const list = grouped.get(key) ?? [];
    list.push(d);
    grouped.set(key, list);
  }
  return (
    <SiteLayout cta={{ heading: <>Book your <span className="text-gold">transfer</span></>, label: "Get a fixed price", trackAs: "final_cta_hub" }}>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={intro}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: title }]}
      />
      {/* Bands sit directly in <main> so the shared white / cream rhythm applies. */}
      {(longIntro || (!notesAfterDestinations && notes && notes.length > 0)) && (
        <PageBand ariaLabel="Overview">
          {longIntro && (
            <p className="max-w-3xl text-lg leading-relaxed text-[var(--navy)]/75">{longIntro}</p>
          )}
          {!notesAfterDestinations && notes && notes.length > 0 && (
            <div className={longIntro ? "mt-10" : ""}><BenefitCards notes={notes} /></div>
          )}
        </PageBand>
      )}

      {featured && featured.length > 0 && (
        <PageBand eyebrow="Featured guides" title="Start with these guides">
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((f) => (
              <Link
                key={f.href}
                to={f.href}
                className="group rounded-2xl border border-border bg-card p-6 shadow-raised transition hover:border-[var(--gold)]"
              >
                <h3 className="font-display text-lg font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.blurb}</p>
              </Link>
            ))}
          </div>
        </PageBand>
      )}

      <PageBand eyebrow={eyebrow} title="Choose your destination" subtitle={destinations.length ? `${destinations.length} ${destinations.length === 1 ? "page" : "pages"}, grouped by region.` : undefined}>
      {destinations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 bg-card p-8 text-center shadow-raised">
          <p className="text-[var(--navy)]/70">
            We haven't published dedicated pages for this category yet, but we still
            cover every UK postcode. Get a fixed-price quote in under 30 seconds.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="rounded-full bg-[var(--gold)] px-6 py-3 font-semibold text-[var(--navy)]">
              Get a fixed price
            </Link>
            <Link to="/areas" className="rounded-full border border-[var(--navy)]/20 px-6 py-3 font-semibold text-[var(--navy)]">
              Browse all locations
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {[...grouped.entries()].map(([region, items]) => (
            <div key={region}>
              <h3 className="mb-5 flex items-center gap-3 font-display text-lg font-semibold text-[var(--navy)]">
                {region}
                <span className="rounded-full bg-[var(--surface-gold)] px-2.5 py-0.5 text-xs font-bold text-[var(--gold-ink)]">{items.length}</span>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </h3>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <li key={d.id}>
                    <DestinationCard d={d} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      </PageBand>
      {content && <LongFormSections sections={content.sections} heading={`About ${title.toLowerCase()}`} />}
      {notesAfterDestinations && notes && notes.length > 0 && (
        <PageBand eyebrow="What to expect" title="Good to know"><BenefitCards notes={notes} /></PageBand>
      )}
      {content && <FaqSection faqs={content.faqs} />}
    </SiteLayout>
  );
}

function BenefitCards({ notes }: { notes: { title: string; body: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((n) => (
        <div key={n.title} className="rounded-2xl border border-border bg-card p-6 shadow-raised">
          <h3 className="font-display text-lg font-semibold text-[var(--navy)]">{n.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--navy)]/70">{n.body}</p>
        </div>
      ))}
    </div>
  );
}
