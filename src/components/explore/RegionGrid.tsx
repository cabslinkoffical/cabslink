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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {regions.map((r) => (
        <Link
          key={r.slug}
          to="/areas/region/$slug"
          params={{ slug: r.slug }}
          className="group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-lg border border-gold/20 bg-navy p-6 text-navy-foreground shadow-dark-raised transition duration-500 hover:-translate-y-1 hover:border-gold/60 hover:shadow-dark-raised-hover"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gold/60" aria-hidden />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-gold" />
                <h3 className="font-display text-2xl font-semibold text-navy-foreground">{r.name}</h3>
              </div>
              <span className="border border-navy-foreground/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-navy-foreground/70">
                {r.count}
              </span>
            </div>
            {r.popularTowns.length > 0 && (
              <p className="mt-3 text-sm leading-relaxed text-navy-foreground/65 line-clamp-2">
                {r.popularTowns.join(" · ")}
              </p>
            )}
          </div>
          <div className="relative mt-6 flex items-center justify-between border-t border-navy-foreground/15 pt-4 text-xs">
            {r.hasAirports ? (
              <span className="inline-flex items-center gap-1 font-semibold text-gold">
                <Plane className="size-3.5" /> Airport routes
              </span>
            ) : (
              <span className="text-navy-foreground/50">Regional coverage</span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-navy-foreground transition group-hover:text-gold">
              View {r.name} <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
