/**
 * Renders the Section[] produced by the content engine. Each section is a
 * self-contained block; nothing renders when its data is missing.
 */
import type { Section } from "@/lib/seo/content-engine";
import type { LoadedDestination } from "@/components/site/DestinationPage";
import { EntityBox } from "@/components/seo/EntityBox";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { LinkModuleList } from "@/components/seo/LinkModuleList";
import { SpeakableBlock } from "@/components/seo/SpeakableBlock";
import {
  nearbyLinks,
  popularRouteLinks,
  relatedServiceLinks,
} from "@/lib/internal-links";

export function DestinationSections({
  sections,
  loaded,
}: {
  sections: Section[];
  loaded: LoadedDestination;
}) {
  return (
    <div className="space-y-10">
      {sections.map((s, i) => (
        <SectionRenderer key={`${s.key}-${i}`} section={s} loaded={loaded} />
      ))}
    </div>
  );
}

function SectionRenderer({ section, loaded }: { section: Section; loaded: LoadedDestination }) {
  switch (section.key) {
    case "summary":
      return (
        <SpeakableBlock>
          <div className="space-y-3">
            {section.sentences.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </SpeakableBlock>
      );
    case "route_action":
      return (
        <section className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Route</h2>
          <p className="mt-2 text-[var(--navy)]/80">
            <strong>{section.from}</strong> → <strong>{section.to}</strong>
            {section.distanceKm ? ` · approx. ${section.distanceKm} km` : ""}
          </p>
        </section>
      );
    case "facts":
      return <EntityBox d={loaded.destination} />;
    case "geo_context":
      return (
        <section aria-label="Location context" className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Where it is</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {section.parts.map((p) => (
              <div key={p.label}>
                <dt className="text-[var(--navy)]/60">{p.label}</dt>
                <dd className="font-medium text-[var(--navy)]">{p.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "airport_info":
    case "attraction_info":
      return (
        <section className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Key facts</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {section.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-[var(--navy)]/60">{k}</dt>
                <dd className="font-medium text-[var(--navy)]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "popular_routes":
      return <LinkModuleList modules={[popularRouteLinks(loaded.popularRoutes)]} />;
    case "nearby":
      return <LinkModuleList modules={[nearbyLinks(loaded.nearby)]} />;
    case "related_services":
      return <LinkModuleList modules={[relatedServiceLinks(loaded.relatedServices)]} />;
    case "faq":
      return <FaqBlock items={section.items} />;
    case "book_cta":
      return (
        <a
          href={section.href}
          className="inline-block rounded-2xl bg-[var(--gold)] px-6 py-3 font-semibold text-[var(--navy)] hover:brightness-95"
        >
          {section.label}
        </a>
      );
  }
}
