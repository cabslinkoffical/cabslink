import { Link } from "@tanstack/react-router";
import { MapPin, Plane, ArrowRight } from "lucide-react";
import type { RegionCard } from "@/lib/explore.functions";

export function RegionGrid({ regions }: { regions: RegionCard[] }) {
  if (!regions.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center text-[var(--navy)]/60 shadow-raised">
        Regions will appear here as destinations are added.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {regions.map((r) => (
        <Link
          key={r.slug}
          to="/areas/region/$slug"
          params={{ slug: r.slug }}
          className="group flex flex-col justify-between rounded-2xl border border-[var(--navy)]/10 bg-white p-5 transition hover:border-[var(--gold)] shadow-raised hover:shadow-raised-hover"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-[var(--gold)]" />
                <h3 className="text-lg font-semibold text-[var(--navy)]">{r.name}</h3>
              </div>
              <span className="rounded-full bg-[var(--navy)]/6 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--navy)]/70">
                {r.count}
              </span>
            </div>
            {r.popularTowns.length > 0 && (
              <p className="mt-3 text-sm text-[var(--navy)]/70 line-clamp-2">
                {r.popularTowns.join(" · ")}
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            {r.hasAirports ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--gold-ink)]">
                <Plane className="size-3.5" /> Airport routes
              </span>
            ) : (
              <span className="text-[var(--navy)]/40">Regional coverage</span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--navy)]/70 group-hover:text-[var(--gold-ink)]">
              View <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
