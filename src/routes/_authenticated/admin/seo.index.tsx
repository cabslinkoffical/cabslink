import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSeoOverview } from "@/lib/seo-admin.functions";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { MapPin, Plane, Wrench, Route as RouteIcon, FileText, ArrowLeftRight } from "lucide-react";

const opts = queryOptions({ queryKey: ["admin", "seo", "overview"], queryFn: () => getSeoOverview() });

export const Route = createFileRoute("/_authenticated/admin/seo/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: SeoOverview,
});

function SeoOverview() {
  const { data } = useSuspenseQuery(opts);
  const cards = [
    { label: "Locations", value: `${data.locations.published}/${data.locations.total}`, icon: MapPin, accent: "text-blue-600", to: "/admin/seo/locations" },
    { label: "Airports", value: `${data.airports.published}/${data.airports.total}`, icon: Plane, accent: "text-sky-600", to: "/admin/seo/airports" },
    { label: "Services", value: `${data.services.published}/${data.services.total}`, icon: Wrench, accent: "text-amber-600", to: "/admin/seo/services" },
    { label: "Popular Routes", value: `${data.routes.published}/${data.routes.total}`, icon: RouteIcon, accent: "text-violet-600", to: "/admin/seo/routes" },
    { label: "SEO Pages", value: String(data.pages.total), icon: FileText, accent: "text-emerald-600", to: "/admin/seo/pages" },
    { label: "Redirects", value: `${data.redirects.active}/${data.redirects.total}`, icon: ArrowLeftRight, accent: "text-rose-600", to: "/admin/seo/redirects" },
  ];
  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="SEO System" description="Programmatic SEO entities, landing pages and redirects. Published counts shown as live/total." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => (
          <Link key={c.label} to={c.to as any} className="block">
            <StatCard label={c.label} value={c.value} icon={c.icon} accent={c.accent} />
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-3">SEO pages by status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data.pages.byStatus).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</div>
              <div className="text-2xl font-semibold mt-1">{v as number}</div>
            </div>
          ))}
          {Object.keys(data.pages.byStatus).length === 0 && (
            <p className="text-sm text-muted-foreground">No SEO pages yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
