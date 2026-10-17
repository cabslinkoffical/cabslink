import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ArrowRight, MapPin } from "lucide-react";
import type { HubDestination } from "@/lib/destinations.functions";
import { destinationHref } from "@/lib/destinations.functions";

/**
 * The single site-wide destination card used by every hub page (attractions,
 * distilleries, airports, stations, cruise ports, universities, hospitals,
 * corporate, guides): real photo on top, name and location, and an arrow that
 * expands the destination's own page intro in place.
 */
export function DestinationCard({ d }: { d: HubDestination }) {
  const [open, setOpen] = useState(false);
  const href = destinationHref(d);
  const place = [d.town, d.council, d.region].filter(Boolean)[0] ?? d.region;
  const locationLine = [d.town, d.council].filter(Boolean).join(", ") || d.region;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-white shadow-raised transition hover:border-[var(--gold)] hover:shadow-raised-hover">
      <Link to={href} className="relative block aspect-[4/3] overflow-hidden" aria-label={d.display_name ?? d.name}>
        {d.image ? (
          <img
            src={d.image}
            alt={d.display_name ?? d.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-[var(--navy)]">
            <span className="font-display text-lg font-semibold text-[var(--gold)]">
              {(d.display_name ?? d.name).slice(0, 1)}
            </span>
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--navy)]/45 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[var(--navy)]">
          <MapPin className="size-3 text-[var(--gold-ink)]" />
          {place}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={href} className="min-w-0">
            <span className="block font-display text-base font-semibold text-[var(--navy)] transition-colors group-hover:text-[var(--gold-ink)]">
              {d.display_name ?? d.name}
            </span>
            {locationLine && (
              <span className="mt-0.5 block truncate text-xs text-[var(--navy)]/60">{locationLine}</span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? `Hide details about ${d.display_name ?? d.name}` : `Show details about ${d.display_name ?? d.name}`}
            className={`grid size-8 shrink-0 place-items-center rounded-full border transition-all ${
              open
                ? "rotate-180 border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-foreground)]"
                : "border-[var(--navy)]/20 text-[var(--navy)] hover:border-[var(--gold)]"
            }`}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        <div
          className="grid transition-[grid-template-rows] duration-300"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="pt-3">
              {d.intro && (
                <p className="text-sm leading-relaxed text-[var(--navy)]/70">{d.intro}</p>
              )}
              <Link
                to={href}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gold-ink)] hover:underline"
              >
                View {d.display_name ?? d.name} transfers <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
