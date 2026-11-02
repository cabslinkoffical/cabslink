import type { PlaceGuide } from "@/content/place-guides";
import type { RouteFareTable } from "@/lib/seo/route-fares.functions";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { selectedRelatedLinksQuery } from "@/lib/related-links.functions";
import { PageBand, EditorialRows, LinkCards, GroupLabel } from "@/components/site/PageBand";
import { BookOpen, Route as RouteIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

function GuideReading({ path }: { path: string }) {
  const { data } = useSuspenseQuery(selectedRelatedLinksQuery(path, null));
  const tours = data.tours;
  const articles = data.articles ?? [];
  if (!tours.length && !articles.length) return null;
  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-2">
      {tours.length > 0 && (
        <div>
          <GroupLabel icon={RouteIcon}>Private tours from here</GroupLabel>
          <LinkCards links={tours.map((l) => ({ href: l.href, label: l.label }))} columns={1} />
        </div>
      )}
      {articles.length > 0 && (
        <div>
          <GroupLabel icon={BookOpen}>Related reading</GroupLabel>
          <LinkCards links={articles.map((l) => ({ href: l.href, label: l.label }))} columns={1} />
        </div>
      )}
    </div>
  );
}

const routeLabel = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bTo\b/g, "to");

/**
 * Phase 7 guide text as its own page band: aligned editorial rows, then the
 * live fixed fares for linked routes in a proper table (a route with no
 * genuine fare is left out), then tour and article links.
 */
export function PlaceGuideBlock({
  guide,
  fares,
}: {
  guide: PlaceGuide;
  fares?: Array<{ slug: string; table: RouteFareTable | null }>;
}) {
  const live = (fares ?? []).filter((f) => f.table && f.table.fares.length);
  return (
    <PageBand eyebrow="Local travel guide" title="Know before you travel" ariaLabel="Travel guide">
      <EditorialRows items={guide.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs }))} />

      {live.length > 0 && (
        <div className="mt-12">
          <h3 className="mb-4 font-display text-xl font-semibold text-[var(--navy)]">Live fixed fares from this page's routes</h3>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-raised">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-[var(--navy)] text-[var(--navy-foreground)]">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Route</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Distance</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Typical time</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">Fixed fare from</th>
                </tr>
              </thead>
              <tbody>
                {live.map(({ slug, table: t }) => {
                  if (!t) return null;
                  const from = Math.min(...t.fares.map((f) => f.price));
                  return (
                    <tr key={slug} className="border-t border-border even:bg-[var(--surface-2)]">
                      <th scope="row" className="px-5 py-3.5 font-medium">
                        <Link to="/routes/$slug" params={{ slug }} className="text-[var(--navy)] underline-offset-4 hover:text-[var(--gold-ink)] hover:underline">
                          {routeLabel(slug)}
                        </Link>
                      </th>
                      <td className="px-5 py-3.5 text-muted-foreground">{t.distanceMiles} miles</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{t.durationMinutes ? `about ${t.durationMinutes} min` : "—"}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[var(--navy)]">
                        {t.currencySymbol}{from.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Per vehicle, one way. Your exact fare is confirmed before you pay.</p>
        </div>
      )}

      <Suspense fallback={null}><GuideReading path={guide.path} /></Suspense>
    </PageBand>
  );
}
