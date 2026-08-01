/**
 * CoverageMap — region-grouped internal-link module used on /areas and
 * reusable on any hub that needs the full published link graph.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { coverageByRegion, coverageTotals } from "@/lib/seo/coverage";

export function CoverageMap() {
  const regions = coverageByRegion();
  const totals = coverageTotals();
  if (regions.length === 0) return null;

  return (
    <div>
      <p className="mb-8 max-w-2xl text-sm text-[var(--navy)]/70">
        {totals.locations} core locations, {totals.servicePages} local service pages and{" "}
        {totals.journeys} fixed-price journeys — every page below is written from real local
        detail, not a template.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {regions.map((r) => (
          <section
            key={r.region}
            className="rounded-2xl border border-[var(--navy)]/10 bg-white p-6 shadow-raised"
          >
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-[var(--gold-ink)]" />
              <h3 className="font-display text-lg font-semibold text-[var(--navy)]">{r.region}</h3>
            </div>

            <ul className="mt-4 space-y-5">
              {r.locations.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    to={loc.areaPath}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--navy)] hover:text-[var(--gold-ink)]"
                  >
                    {loc.name}
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </Link>

                  {(loc.services.length > 0 || loc.journeys.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {loc.services.map((s) => (
                        <Link
                          key={s.to}
                          to={s.to}
                          className="rounded-md border border-[var(--navy)]/10 bg-[var(--navy)]/[0.03] px-2 py-1 text-[11px] font-medium text-[var(--navy)]/80 transition hover:border-[var(--gold)] hover:text-[var(--navy)]"
                        >
                          {s.label}
                        </Link>
                      ))}
                      {loc.journeys.map((j) => (
                        <Link
                          key={j.to}
                          to={j.to}
                          className="rounded-md border border-dashed border-[var(--navy)]/15 px-2 py-1 text-[11px] font-medium text-[var(--gold-ink)] transition hover:border-[var(--gold)]"
                        >
                          {j.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
