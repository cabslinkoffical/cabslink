/**
 * Shared hub renderer — lists all Tier 1/2 destinations of a given type.
 */
import { Link } from "@tanstack/react-router";
import type { Destination, DestinationType } from "@/lib/destinations.functions";
import { destinationHref } from "@/lib/destinations.functions";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FaqSection, LongFormSections } from "@/components/site/ContentSections";
import { HUB_CONTENT } from "@/lib/hub-content";

export function HubPage({
  title,
  intro,
  longIntro,
  notes,
  destinations,
  contentKey,
  featured,
}: {
  title: string;
  intro: string;
  longIntro?: string;
  notes?: { title: string; body: string }[];
  destinations: Destination[];
  type?: DestinationType;
  /** Key into HUB_CONTENT for the long-form prose + FAQ blocks. */
  contentKey?: string;
  /** Hand-written pages promoted above the destination grid. */
  featured?: { title: string; blurb: string; href: string }[];
}) {

  const content = contentKey ? HUB_CONTENT[contentKey] : undefined;
  const grouped = new Map<string, Destination[]>();
  for (const d of destinations) {
    const key = d.region ?? "United Kingdom";
    const list = grouped.get(key) ?? [];
    list.push(d);
    grouped.set(key, list);
  }
  return (
    <SiteLayout>
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title, href: "#" }]} />
      <header className="mt-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--navy)]">{title}</h1>
        <p className="mt-2 max-w-3xl text-lg text-[var(--navy)]/70">{intro}</p>
        {longIntro && (
          <p className="mt-4 max-w-3xl leading-relaxed text-[var(--navy)]/70">{longIntro}</p>
        )}
      </header>
      {notes && notes.length > 0 && (
        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="sr-only">What to expect</h2>
          {notes.map((n) => (
            <div
              key={n.title}
              className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised"
            >
              <h3 className="font-semibold text-[var(--navy)]">{n.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--navy)]/70">{n.body}</p>
            </div>
          ))}
        </section>
      )}

      {featured && featured.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold-ink)]">
            Featured guides
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {featured.map((f) => (
              <Link
                key={f.href}
                to={f.href}
                className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised hover:border-[var(--gold)]"
              >
                <h3 className="font-semibold text-[var(--navy)]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--navy)]/70">{f.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      )}


      {destinations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center shadow-raised">
          <p className="text-[var(--navy)]/70">
            We haven't published dedicated pages for this category yet, but we still
            cover every UK postcode. Get a fixed-fare quote in under 30 seconds.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="rounded-full bg-[var(--gold)] px-6 py-3 font-semibold text-[var(--navy)]">
              Get an instant quote
            </Link>
            <Link to="/areas" className="rounded-full border border-[var(--navy)]/20 px-6 py-3 font-semibold text-[var(--navy)]">
              Browse all locations
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([region, items]) => (
            <section key={region}>
              <h2 className="mb-3 text-lg font-semibold text-[var(--navy)]">{region}</h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <li key={d.id}>
                    <Link
                      to={destinationHref(d)}
                      className="block rounded-xl border border-[var(--navy)]/10 bg-white p-4 hover:border-[var(--gold)] shadow-raised hover:shadow-raised-hover"
                    >
                      <span className="block font-medium text-[var(--navy)]">
                        {d.display_name ?? d.name}
                      </span>
                      {(d.council || d.town) && (
                        <span className="block text-xs text-[var(--navy)]/60">
                          {[d.town, d.council].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
      {content && (
        <>
          <LongFormSections sections={content.sections} heading={`About ${title.toLowerCase()}`} />
          <FaqSection faqs={content.faqs} />
        </>
      )}
    </SiteLayout>
  );
}
