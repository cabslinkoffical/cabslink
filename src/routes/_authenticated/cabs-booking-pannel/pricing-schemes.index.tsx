import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Percent, Route as RouteIcon, SlidersHorizontal } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { listPricingSchemes } from "@/lib/pricing-schemes.functions";

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

function Count({ icon: Icon, n, label }: { icon: any; n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums" title={label}>
      <Icon className="size-3.5 text-primary" />{n}
    </span>
  );
}

function PricingSchemesPage() {
  const { data } = useSuspenseQuery(opts);
  const schemes = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Schemes"
        description="One scheme per vehicle class. Everything that prices a journey for that class lives inside it."
      >
        <Link
            to="/cabs-booking-pannel/pricing-preview"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-2 text-sm font-semibold text-[var(--gold)] transition hover:bg-[var(--gold)]/20"
          >
          Price a test journey
        </Link>
      </PageHeader>

      {schemes.length === 0 ? (
        <EmptyState title="No vehicle classes yet" hint="Create a vehicle class first, then price it here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schemes.map((s: any) => (
            <Link
              key={s.id}
              to="/cabs-booking-pannel/pricing-schemes/$id"
              params={{ id: s.id }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">{s.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.pricingVehicleId
                      ? s.basePrice != null ? `Base £${Number(s.basePrice).toFixed(2)}` : "Base not set"
                      : "No pricing vehicle linked"}
                  </p>
                </div>
                <div className="flex-1" />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Count icon={RouteIcon} n={s.counts.routes} label="Fixed routes" />
                <Count icon={MapPin} n={s.counts.locations} label="Location rules" />
                <Count icon={Percent} n={s.counts.discounts} label="Discounts" />
                <Count icon={SlidersHorizontal} n={s.counts.modifiers} label="Modifiers" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.pricingLive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {s.pricingLive ? "Pricing live" : "Pricing off"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {s.active ? "Class active" : "Class hidden"}
                </span>
                {s.quoteOnRequest && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Quote on request</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
