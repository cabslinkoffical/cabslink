import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { ArrowRight, BookOpen, MapPin, Plane, Route as RouteIcon } from "lucide-react";
import { selectedRelatedLinksQuery } from "@/lib/related-links.functions";
import { type RelatedCandidate } from "@/lib/related-links";

type Props = { center?: { lat: number; lng: number } | null };

function Group({ title, icon: Icon, links }: { title: string; icon: typeof Plane; links: RelatedCandidate[] }) {
  if (!links.length) return null;
  return (
    <div>
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-[var(--navy)]">
        <Icon className="size-4 text-[var(--gold-ink)]" aria-hidden /> {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="group inline-flex items-center gap-1.5 text-sm text-[var(--navy)]/80 hover:text-[var(--gold-ink)]">
              <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
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
  if (!picked.airports.length && !picked.areas.length && !picked.tours.length) return null;
  return (
    <section aria-labelledby="related-pages-heading" className="mx-auto mt-16 max-w-6xl px-4 pb-4 sm:px-6">
      <div className="rounded-3xl border border-[var(--navy)]/10 bg-[var(--surface-2)] p-6 sm:p-8">
        <h2 id="related-pages-heading" className="font-display text-2xl font-bold text-[var(--navy)]">Related pages</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Group title="Airports" icon={Plane} links={picked.airports} />
          <Group title="Areas we cover" icon={MapPin} links={picked.areas} />
          <Group title="Tours" icon={RouteIcon} links={picked.tours} />
          <Group title="Related articles" icon={BookOpen} links={picked.articles ?? []} />
        </div>
      </div>
    </section>
  );
}

/** Shared related-pages block, rendered inside page content before the footer. */
export function RelatedLinks(props: Props) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
