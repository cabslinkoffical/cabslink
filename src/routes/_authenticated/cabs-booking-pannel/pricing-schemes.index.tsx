import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Layers,
  MapPin,
  Percent,
  Route as RouteIcon,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { PageHeader, EmptyState, StatCard } from "@/components/admin/ui";
import { listPricingSchemes } from "@/lib/pricing-schemes.functions";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const opts = queryOptions({
  queryKey: ["admin", "pricing-schemes"],
  queryFn: () => listPricingSchemes(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/pricing-schemes/")({
  head: () => ({
    meta: [
      { title: "Pricing Schemes — Cabslink Admin" },
      { name: "description", content: "One pricing scheme per vehicle class: base fares, routes, locations, discounts and modifiers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  component: PricingSchemesPage,
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Pricing live" },
  { key: "off", label: "Pricing off" },
  { key: "hidden", label: "Class hidden" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const RULES = [
  { key: "routes", label: "Fixed routes", icon: RouteIcon },
  { key: "locations", label: "Location rules", icon: MapPin },
  { key: "discounts", label: "Discounts", icon: Percent },
  { key: "modifiers", label: "Modifiers", icon: SlidersHorizontal },
] as const;

function RuleChip({ icon: Icon, n, label }: { icon: any; n: number; label: string }) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ring-1",
        n > 0 ? "bg-surface-gold text-gold-ink ring-gold/30" : "bg-muted text-muted-foreground ring-border",
      )}
    >
      <Icon className="size-3.5" />
      {n}
      <span className="hidden font-medium opacity-70 sm:inline">{label}</span>
    </span>
  );
}

function StateDot({ live }: { live: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", live ? "text-gold-ink" : "text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", live ? "bg-gold" : "bg-muted-foreground/50")} />
      {live ? "Pricing live" : "Pricing off"}
    </span>
  );
}

function PricingSchemesPage() {
  const { data } = useSuspenseQuery(opts);
  const schemes = (data ?? []) as any[];
  const [view, setView] = useViewMode("pricing-schemes");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const stats = useMemo(() => ({
    total: schemes.length,
    live: schemes.filter((s) => s.pricingLive).length,
    rules: schemes.reduce((n, s) => n + s.counts.routes + s.counts.locations + s.counts.discounts + s.counts.modifiers, 0),
    hidden: schemes.filter((s) => !s.active).length,
  }), [schemes]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return schemes.filter((s) => {
      if (term && !`${s.name} ${s.slug}`.toLowerCase().includes(term)) return false;
      if (filter === "live") return s.pricingLive;
      if (filter === "off") return !s.pricingLive;
      if (filter === "hidden") return !s.active;
      return true;
    });
  }, [schemes, q, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Schemes"
        description="One scheme per vehicle class. Everything that prices a journey for that class lives inside it."
      >
        <ViewToggle mode={view} onChange={setView} />
        <Link
          to="/cabs-booking-pannel/pricing-preview"
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-surface-gold px-4 py-2 text-sm font-semibold text-gold-ink transition hover:bg-gold/20"
        >
          Price a test journey
        </Link>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vehicle classes" value={stats.total} icon={Layers} />
        <StatCard label="Pricing live" value={stats.live} icon={Wallet} hint={`${stats.total - stats.live} not live`} />
        <StatCard label="Pricing rules" value={stats.rules} icon={SlidersHorizontal} hint="Routes, locations, discounts, modifiers" />
        <StatCard label="Classes hidden" value={stats.hidden} icon={MapPin} accent="text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vehicle classes…"
            className="h-10 rounded-full pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-secondary/60 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                filter === f.key ? "bg-navy text-navy-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {schemes.length === 0 ? (
        <EmptyState title="No vehicle classes yet" hint="Create a vehicle class first, then price it here." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches that filter" hint="Try a different search term or clear the status filter." />
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <Link
              key={s.id}
              to="/cabs-booking-pannel/pricing-schemes/$id"
              params={{ id: s.id }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg"
            >
              <span className={cn("absolute inset-x-0 top-0 h-1", s.pricingLive ? "bg-gold" : "bg-border")} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">{s.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">/{s.slug}</p>
                </div>
                <StateDot live={s.pricingLive} />
              </div>

              <div className="mt-4 rounded-xl bg-secondary/60 px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Base fare</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight">
                  {s.pricingVehicleId && s.basePrice != null ? `£${Number(s.basePrice).toFixed(2)}` : "—"}
                </p>
                {!(s.pricingVehicleId && s.basePrice != null) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Set a base fare to start quoting</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {RULES.map((r) => (
                  <RuleChip key={r.key} icon={r.icon} n={s.counts[r.key]} label={r.label} />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                    s.active ? "bg-navy text-navy-foreground ring-navy/20" : "bg-secondary text-muted-foreground ring-border",
                  )}>
                    {s.active ? "Class active" : "Class hidden"}
                  </span>
                  {s.quoteOnRequest && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                      Quote on request
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold-ink">
                  Edit
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="hidden grid-cols-[minmax(0,2fr)_7rem_minmax(0,2fr)_9rem_5rem] gap-4 border-b border-border bg-secondary/50 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid">
            <span>Vehicle class</span>
            <span className="text-right">Base fare</span>
            <span>Rules</span>
            <span>Status</span>
            <span className="text-right">Edit</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((s) => (
              <li key={s.id}>
                <Link
                  to="/cabs-booking-pannel/pricing-schemes/$id"
                  params={{ id: s.id }}
                  className="group grid gap-3 px-5 py-3.5 transition hover:bg-surface-gold/50 lg:grid-cols-[minmax(0,2fr)_7rem_minmax(0,2fr)_9rem_5rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold">{s.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">/{s.slug}</p>
                  </div>
                  <p className="font-display text-sm font-semibold tabular-nums lg:text-right">
                    {s.pricingVehicleId && s.basePrice != null ? `£${Number(s.basePrice).toFixed(2)}` : "—"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {RULES.map((r) => (
                      <RuleChip key={r.key} icon={r.icon} n={s.counts[r.key]} label={r.label} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StateDot live={s.pricingLive} />
                    {!s.active && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                        Hidden
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold-ink lg:justify-end">
                    Edit
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
