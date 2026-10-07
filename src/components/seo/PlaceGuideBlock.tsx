import { Link } from "@tanstack/react-router";
import type { PlaceGuide } from "@/content/place-guides";
import type { RouteFareTable } from "@/lib/seo/route-fares.functions";

/**
 * Phase 7 guide text, rendered BELOW a page's existing content. Live fares
 * for linked routes come from the pricing engine; a route with no genuine
 * fare is simply left out.
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
    <section aria-label="Travel guide" className="space-y-8 border-t pt-10">
      {guide.sections.map((s) => (
        <div key={s.heading}>
          <h2 className="text-2xl font-semibold mb-3">{s.heading}</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            {s.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      ))}
      {live.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-3">Live fixed fares from this page's routes</h2>
          <ul className="space-y-2">
            {live.map(({ slug, table }) => {
              const t = table!;
              const from = Math.min(...t.fares.map((f) => f.price));
              return (
                <li key={slug} className="rounded-lg border bg-card p-4 text-sm">
                  <Link to="/routes/$slug" params={{ slug }} className="font-medium underline-offset-4 hover:underline">
                    {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}— {t.distanceMiles} miles{t.durationMinutes ? `, about ${t.durationMinutes} minutes` : ""}, from{" "}
                    {t.currencySymbol}
                    {from.toFixed(2)} per vehicle
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
