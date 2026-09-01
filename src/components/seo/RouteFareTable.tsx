import { Link } from "@tanstack/react-router";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";

/**
 * Published fare table for a route page. Every figure is produced by the
 * live pricing engine from the route's real driving distance — the caller
 * omits this component entirely when no reliable fare exists.
 */
export function RouteFareTable({ data, routeName }: { data: RouteFareTableData; routeName: string }) {
  const money = (n: number) => `${data.currencySymbol}${n.toFixed(2)}`;

  return (
    <section aria-labelledby="route-fares">
      <h2 id="route-fares" className="text-2xl font-semibold mb-2">
        {routeName} fares by vehicle class
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Fixed prices for the full {data.distanceMiles} mile journey
        {data.durationMinutes ? `, typically around ${data.durationMinutes} minutes` : ""}.
        One-way, all-inclusive
        {data.taxIncluded ? ` of ${data.taxLabel}` : ""} — no meter and no airport surcharge added later.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Fixed one-way fares per vehicle class for {routeName}
          </caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Vehicle class</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Passengers</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Luggage</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Fixed fare</th>
            </tr>
          </thead>
          <tbody>
            {data.fares.map((f) => (
              <tr key={f.classSlug} className="border-t">
                <th scope="row" className="px-4 py-3 text-left font-medium">{f.className}</th>
                <td className="px-4 py-3 text-muted-foreground">{f.passengers || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.luggage || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(f.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Prices shown are for a single vehicle, one way.{" "}
        <Link to="/book" className="underline font-medium">Confirm your exact fare</Link> with your
        pickup address, date and time.
      </p>
    </section>
  );
}
