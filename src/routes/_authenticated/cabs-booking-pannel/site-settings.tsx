import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { SETTINGS_GROUPS } from "@/components/admin/admin-areas";
import { slug } from "@/components/admin/AreaGateway";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/site-settings")({
  head: () => ({
    meta: [
      { title: "All settings — Cabslink Admin" },
      { name: "description", content: "Every website and booking setting in one place." },
      { property: "og:title", content: "All settings — Cabslink Admin" },
      { property: "og:description", content: "Every website and booking setting in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsHub,
});

function SettingsHub() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const total = SETTINGS_GROUPS.reduce((n, g) => n + g.items.length, 0);

  const groups = useMemo(() => {
    if (!q) return SETTINGS_GROUPS;
    return SETTINGS_GROUPS
      .map((g) => ({
        ...g,
        items: g.label.toLowerCase().includes(q)
          ? g.items
          : g.items.filter((i) => `${i.label} ${i.description}`.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-8 text-navy-foreground sm:px-8 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border-[28px] border-gold/15" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full border-[18px] border-gold/10" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold ring-1 ring-gold/30">
            <SlidersHorizontal className="size-3.5" /> Control centre
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Every setting for your website</h1>
          <p className="mt-2 text-sm text-navy-foreground/80">
            {total} places to change prices, vehicles, tours, pages and company details. Search or pick a card.
          </p>
          <div className="relative mt-5 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a setting, e.g. coupons, redirects…"
              aria-label="Find a setting"
              className="h-11 w-full rounded-xl border-0 bg-background pl-9 pr-9 text-sm text-foreground shadow-sm outline-none ring-2 ring-transparent placeholder:text-muted-foreground focus:ring-gold"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No setting matches “{query}”.
        </p>
      )}

      {groups.map((g, gi) => (
        <section key={g.label} id={slug(g.label)} aria-labelledby={`grp-${gi}`} className="scroll-mt-20">
          <div className="mb-3 flex items-end justify-between gap-4 border-b border-border pb-2">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-navy text-gold">
                <g.icon className="size-4" />
              </span>
              <div>
                <h2 id={`grp-${gi}`} className="font-display text-lg font-semibold">{g.label}</h2>
                <p className="text-xs text-muted-foreground">{g.blurb}</p>
              </div>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{g.items.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.items.map((it) => (
              <Link
                key={it.to}
                to={it.to as any}
                className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-surface-gold text-gold-ink ring-1 ring-gold/25">
                    <it.icon className="size-4" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-gold-ink" />
                </div>
                <span className="font-semibold">{it.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{it.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
