import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin, Star } from "lucide-react";
import type { PublicTourListItem } from "@/lib/tours.functions";

export function formatTourDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function TourCard({ tour }: { tour: PublicTourListItem }) {
  const duration = formatTourDuration(tour.direct_duration_seconds);
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-[var(--navy)]/8 transition-all shadow-raised hover:shadow-raised-hover">
      {/* Media — identical ratio on every card */}
      <Link
        to="/tours/$slug"
        params={{ slug: tour.slug }}
        className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--navy)]/90"
      >
        {tour.hero_image_url ? (
          <img
            src={tour.hero_image_url}
            alt={`${tour.name} private tour`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-[var(--navy)]" />
        )}

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {tour.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--navy)] shadow-sm">
              <Star className="size-3 fill-current" /> Signature
            </span>
          ) : (
            <span />
          )}
          {duration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--navy)] backdrop-blur">
              <Clock className="size-3" /> {duration}
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Link to="/tours/$slug" params={{ slug: tour.slug }} className="block">
          <h3 className="font-display text-lg sm:text-xl font-semibold leading-snug text-[var(--navy)] line-clamp-2 min-h-[3.25rem] group-hover:text-[var(--gold-ink)]">
            {tour.name}
          </h3>
        </Link>
        <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/65 line-clamp-2 min-h-[2.5rem]">
          {tour.short_description ?? "Private door-to-door day tour with a professional driver."}
        </p>

        <div className="mt-3.5 flex min-h-[1.25rem] flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--navy)]/70">
          {tour.origin_label && tour.destination_label && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 text-[var(--gold)]" />
              {tour.origin_label} → {tour.destination_label}
            </span>
          )}
          {tour.recommended_stop_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="size-1 rounded-full bg-[var(--navy)]/30" />
              {tour.recommended_stop_count} stops
            </span>
          )}
        </div>

        {/* Footer pinned to bottom — view + enquire, no pricing */}
        <div className="mt-auto pt-5">
          <div className="h-px w-full bg-[var(--navy)]/8" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              to="/tours/$slug"
              params={{ slug: tour.slug }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--navy)]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--navy)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
            >
              View tour
            </Link>
            <Link
              to="/tours/$slug"
              params={{ slug: tour.slug }}
              search={{ enquire: true }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--gold)] hover:text-[var(--navy)]"
            >
              Enquire
              <ArrowRight className="size-4" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

