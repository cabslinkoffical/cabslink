import { Link } from "@tanstack/react-router";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { SectionHeader } from "@/components/site/PageHero";

/**
 * Published fare table for a route page. Every figure is produced by the
 * live pricing engine from the route's real driving distance — the caller
 * omits this component entirely when no reliable fare exists.
 */
export function RouteFareTable({ data, routeName }: { data: RouteFareTableData; routeName: string }) {
  const money = (n: number) => `${data.currencySymbol}${n.toFixed(2)}`;
  const cheapest = Math.min(...data.fares.map((f) => f.price));

  return (
    <div aria-labelledby="route-fares">
      <div id="route-fares">
        <SectionHeader
          eyebrow="Fixed prices"
          title={`${routeName} fares by vehicle class`}
          subtitle={`Fixed prices for the full ${data.distanceMiles} mile journey${data.durationMinutes ? `, typically around ${data.durationMinutes} minutes` : ""}. One-way, all-inclusive${data.taxIncluded ? ` of ${data.taxLabel}` : ""} — no meter and no airport surcharge added later.`}
        />
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-raised">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">
            Fixed one-way fares per vehicle class for {routeName}
          </caption>
          <thead className="bg-[var(--navy)] text-[var(--navy-foreground)]">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">Vehicle class</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Passengers</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Luggage</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Fixed price</th>
            </tr>
          </thead>
          <tbody>
            {data.fares.map((f) => (
              <tr key={f.classSlug} className="border-t border-border even:bg-[var(--surface-2)]">
                <th scope="row" className="px-5 py-3.5 font-semibold text-[var(--navy)]">
                  {f.className}
                  {f.price === cheapest && (
                    <span className="ml-2 rounded-full bg-[var(--surface-gold)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                      Lowest
                    </span>
                  )}
                </th>
                <td className="px-5 py-3.5 text-muted-foreground">{f.passengers || "—"}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{f.luggage || "—"}</td>
                <td className="px-5 py-3.5 text-right font-bold tabular-nums text-[var(--navy)]">{money(f.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Prices shown are for a single vehicle, one way.{" "}
        <Link to="/book" className="font-semibold text-[var(--navy)] underline underline-offset-4 hover:text-[var(--gold-ink)]">Confirm your exact fare</Link> with your
        pickup address, date and time.
      </p>
    </div>
  );
}
