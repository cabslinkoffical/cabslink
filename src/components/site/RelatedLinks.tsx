import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { ArrowRight, BookOpen, MapPin, Plane, Route as RouteIcon, Sparkles } from "lucide-react";
import { selectedRelatedLinksQuery } from "@/lib/related-links.functions";
import { type RelatedCandidate } from "@/lib/related-links";
import { guideFor } from "@/content/place-guides";
import { PageBand } from "@/components/site/PageBand";
import { specialistLinksFor } from "@/lib/seo/specialist-links";

type Props = { center?: { lat: number; lng: number } | null };

function Group({ title, icon: Icon, links }: { title: string; icon: typeof Plane; links: RelatedCandidate[] }) {
  if (!links.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-raised">
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-[var(--navy)]">
        <span className="grid size-8 place-items-center rounded-full bg-[var(--surface-gold)]">
          <Icon className="size-4 text-[var(--gold-ink)]" aria-hidden />
        </span>
        {title}
      </h3>
      <ul className="mt-4 divide-y divide-border">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="group flex items-start gap-2 py-2.5 text-sm font-medium text-[var(--navy)]/85 hover:text-[var(--gold-ink)]">
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-[var(--gold-ink)] transition-transform group-hover:translate-x-0.5" aria-hidden />
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Inner({ center }: Props) {
  const path = useLocation({ select: (l) => l.pathname });
  const { data: picked } = useSuspenseQuery(selectedRelatedLinksQuery(path, center ?? null));
  const hasGuide = !!guideFor(path);
  const specialist = specialistLinksFor(path) as RelatedCandidate[];
  if (!picked.airports.length && !picked.areas.length && !picked.tours.length && !specialist.length) return null;
  const groups = [
    { title: "Airports", icon: Plane, links: picked.airports },
    { title: "Areas we cover", icon: MapPin, links: picked.areas },
    ...(!hasGuide ? [{ title: "Related tours", icon: RouteIcon, links: picked.tours }] : []),
    ...(!hasGuide ? [{ title: "Related articles", icon: BookOpen, links: picked.articles ?? [] }] : []),
    { title: "Specialist services", icon: Sparkles, links: specialist },
  ].filter((g) => g.links.length > 0);
  const cols = groups.length >= 4 ? "lg:grid-cols-4" : groups.length === 3 ? "lg:grid-cols-3" : "";
  return (
    <PageBand eyebrow="Explore more" title="Related pages">
      <div className={`grid gap-5 sm:grid-cols-2 ${cols}`}>
        {groups.map((g) => (
          <Group key={g.title} {...g} />
        ))}
      </div>
    </PageBand>
  );
}

/** Shared related-pages band, rendered inside page content before the footer. */
export function RelatedLinks(props: Props) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
