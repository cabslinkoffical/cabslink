import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, MapPin, Percent, PlusCircle, Route as RouteIcon, SlidersHorizontal, Wallet } from "lucide-react";
import { getPricingScheme } from "@/lib/pricing-schemes.functions";
import { SchemeOverviewTab } from "@/components/admin/scheme/SchemeOverviewTab";
import { SchemeRoutesTab } from "@/components/admin/scheme/SchemeRoutesTab";
import { SchemeLocationsTab } from "@/components/admin/scheme/SchemeLocationsTab";
import { SchemeDiscountsTab } from "@/components/admin/scheme/SchemeDiscountsTab";
import { SchemeModifiersTab } from "@/components/admin/scheme/SchemeModifiersTab";
import { SchemeExtrasTab } from "@/components/admin/scheme/SchemeExtrasTab";

const schemeOpts = (classId: string) =>
  queryOptions({
    queryKey: ["admin", "pricing-scheme", classId],
    queryFn: () => getPricingScheme({ data: { classId } }),
  });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/pricing-schemes/$id")({
  head: () => ({
    meta: [
      { title: "Pricing Scheme — Cabslink Admin" },
      { name: "description", content: "Base fares, fixed routes, location pricing, discounts and modifiers for one vehicle class." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(schemeOpts(params.id)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-muted-foreground">That pricing scheme was not found.</div>,
  component: PricingSchemePage,
});

const TABS = [
  { key: "base", label: "Base", icon: Wallet },
  { key: "time", label: "Time", icon: Clock },
  { key: "extras", label: "Extras", icon: PlusCircle },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "routes", label: "Routes", icon: RouteIcon },
  { key: "discounts", label: "Discounts", icon: Percent },
  { key: "modifiers", label: "Modifiers", icon: SlidersHorizontal },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function PricingSchemePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(schemeOpts(id));
  const [tab, setTab] = useState<TabKey>("base");

  const counts: Record<TabKey, number | null> = {
    base: null,
    time: null,
    extras: null,
    locations: data.locations.length,
    routes: data.routes.length,
    discounts: data.discounts.length,
    modifiers: data.modifiers.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/cabs-booking-pannel/pricing-schemes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />All pricing schemes
        </Link>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <h1 className="font-display text-2xl font-bold">{data.scheme.name}</h1>
          <span className={`mb-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.base.live ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            {data.base.live ? "Pricing live" : "Pricing off"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything that prices a journey for this class. Saved values feed the same engine as public quotes and checkout.
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="mx-1 inline-flex gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="size-4" />
                {t.label}
                {counts[t.key] != null && (
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "base" && <SchemeOverviewTab scheme={data.scheme} data={data} section="base" />}
      {tab === "time" && <SchemeOverviewTab scheme={data.scheme} data={data} section="time" />}
      {tab === "extras" && <SchemeExtrasTab classId={id} />}
      {tab === "locations" && <SchemeLocationsTab classId={id} locations={data.locations} />}
      {tab === "routes" && <SchemeRoutesTab classId={id} routes={data.routes} />}
      {tab === "discounts" && <SchemeDiscountsTab classId={id} discounts={data.discounts} />}
      {tab === "modifiers" && <SchemeModifiersTab classId={id} modifiers={data.modifiers} />}
    </div>
  );
}
