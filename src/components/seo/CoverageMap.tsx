/**
 * CoverageMap — region-grouped internal-link module used on /areas and
 * reusable on any hub that needs the full published link graph.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { coverageByRegion } from "@/lib/seo/coverage";

export function CoverageMap() {
  const regions = coverageByRegion();
  if (regions.length === 0) return null;

  return (
    <div>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Dozens of fixed-price journeys across the UK — every page below is written from real local detail, not a template.
      </p>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
        {regions.map((r) => (
          <section
            key={r.region}
            className="border-t border-border pt-5"
          >
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-gold" />
              <h3 className="font-display text-xl font-semibold text-foreground">{r.region}</h3>
            </div>

            <ul className="mt-4 space-y-5">
              {r.locations.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    to={loc.areaPath}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-gold"
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
                          className="border-b border-border px-1 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-gold hover:text-foreground"
                        >
                          {s.label}
                        </Link>
                      ))}
                      {loc.journeys.map((j) => (
                        <Link
                          key={j.to}
                          to={j.to}
                          className="border-b border-dashed border-border px-1 py-1 text-[11px] font-medium text-gold transition hover:border-gold"
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
