import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { listActivityLogsPage } from "@/lib/admin-lists.functions";
import { useState } from "react";
import { Pager, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/ui";

const ENTITIES = [
  "bookings", "vehicles", "vehicle_classes", "vehicle_models", "vehicle_pricing_profiles",
  "vehicle_mileage_tiers", "extras", "extra_vehicle_classes", "drivers", "coupons", "addresses",
  "payments", "pricing_rules", "pricing_modifiers", "location_pricing_rules", "discount_rules",
  "hourly_rates", "surcharges", "availability_rules", "content_blocks", "site_settings",
  "blog_posts", "blog_categories", "blog_tags", "blog_authors",
  "seo_pages", "seo_page_sections", "seo_locations", "seo_airports", "seo_services",
  "seo_popular_routes", "seo_redirects", "destinations", "destination_seo",
  "points_of_interest", "scenic_route_templates", "scenic_route_template_pois",
  "notification_templates", "banned_addresses",
];

type LogFilters = { entity?: string; q: string; from?: string; to?: string };
const NO_FILTERS: LogFilters = { q: "" };
const logOpts = (f: LogFilters, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "activity-logs", { ...f, page, pageSize }],
  queryFn: () => listActivityLogsPage({ data: { ...f, page, pageSize } }),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/logs")({
  head: () => ({
    meta: [
      { title: "Logs — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: logs." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(logOpts(NO_FILTERS, 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const [entity, setEntity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  // Filters apply when "Apply" is pressed, as before; results load a page at a time.
  const [applied, setApplied] = useState<LogFilters>(NO_FILTERS);
  const paging = usePageState(applied);
  const listQ = useQuery(logOpts(applied, paging.page, paging.pageSize));
  const rows = (listQ.data?.rows ?? []) as any[];
  const apply = () => setApplied({
    entity: entity === "all" ? undefined : entity,
    q: search.trim(),
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
  });

  function actionColor(a: string) {
    if (a === "insert") return "text-success";
    if (a === "delete") return "text-destructive";
    return "text-warning";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Logs" description="Every admin action across the system, with before/after diffs." />

      <div className="flex flex-wrap gap-3 items-end p-4 border border-border rounded-xl bg-card">
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="email, entity id, action…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Entity</Label>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button onClick={apply} disabled={listQ.isFetching}>{listQ.isFetching ? "Loading…" : "Apply"}</Button>
      </div>

      {rows.length === 0 ? <EmptyState title="No activity in this range" /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-8"></th>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row: any) => (
                <Fragment key={row.id}>
                  <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <td className="pl-3">{expanded === row.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{row.actor_email ?? <span className="text-muted-foreground">system</span>}</td>
                    <td className={`px-4 py-3 font-medium capitalize ${actionColor(row.action)}`}>{row.action}</td>
                    <td className="px-4 py-3"><code className="text-xs">{row.entity}</code></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{row.entity_id?.slice(0, 8)}…</td>
                  </tr>
                  {expanded === row.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-80 overflow-auto bg-background border border-border rounded-md p-3">{JSON.stringify(row.diff, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(listQ.data?.total ?? 0) > 0 && (
        <Pager page={paging.page} pageSize={paging.pageSize} total={listQ.data?.total ?? 0} noun="log entries" loading={listQ.isFetching}
          onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} />
      )}
    </div>
  );
}
