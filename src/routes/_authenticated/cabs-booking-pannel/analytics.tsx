import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatCard, EmptyState } from "@/components/admin/ui";
import { getSiteAnalytics } from "@/lib/analytics.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OwnAnalyticsTab, GoogleAnalyticsTab } from "@/components/admin/OwnAnalyticsTabs";
import { GA_MEASUREMENT_ID } from "@/lib/analytics-ga";
import {
  BarChart3, PoundSterling, Calculator, Percent, XCircle, CheckCircle2, Inbox,
  Download, ArrowUpRight, ArrowDownRight, Minus, ExternalLink, FileSearch,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: performance analytics." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: AnalyticsPage,
});

const GOLD = "#deae25";
const NAVY = "#0e182c";
const SLICES = [NAVY, GOLD, "#3b4a63", "#b8901c", "#6b7a94", "#8a6c14", "#9fadc4", "#f0cf72"];

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; }
function money(n: number) { return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function Delta({ change, invert = false }: { change: number | null | undefined; invert?: boolean }) {
  if (change === null || change === undefined) return <span className="text-muted-foreground">no prior data</span>;
  const rounded = Math.round(change * 10) / 10;
  const good = invert ? rounded < 0 : rounded > 0;
  const flat = rounded === 0;
  const Icon = flat ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={flat ? "text-muted-foreground" : good ? "text-success" : "text-destructive"}>
      <Icon className="inline size-3.5 -mt-0.5" /> {Math.abs(rounded)}% vs previous
    </span>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="admin-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function AnalyticsPage() {
  return (
    <Tabs defaultValue="own" className="space-y-6">
      <TabsList>
        <TabsTrigger value="own">Own analytics</TabsTrigger>
        <TabsTrigger value="business">Bookings &amp; revenue</TabsTrigger>
        <TabsTrigger value="google">Google Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="own"><OwnAnalyticsTab /></TabsContent>
      <TabsContent value="business"><Page /></TabsContent>
      <TabsContent value="google"><GoogleAnalyticsTab /></TabsContent>
    </Tabs>
  );
}

function Page() {
  const [preset, setPreset] = useState<"7" | "30" | "90" | "custom">("30");
  const [from, setFrom] = useState(isoDay(daysAgo(29)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  function applyPreset(p: "7" | "30" | "90" | "custom") {
    setPreset(p);
    if (p === "custom") return;
    const n = Number(p);
    setFrom(isoDay(daysAgo(n - 1)));
    setTo(isoDay(new Date()));
    setGranularity(n > 45 ? "week" : "day");
  }

  const run = useServerFn(getSiteAnalytics);
  const q = useQuery({
    queryKey: ["admin-analytics", from, to, granularity],
    queryFn: () => run({ data: { from, to, granularity } }),
    staleTime: 60_000,
  });

  const r = q.data;
  const k = r?.kpi;

  const csv = useMemo(() => {
    if (!r) return "";
    const head = ["Period", "Bookings", "Quotes", "Revenue"];
    const rows = r.series.map(s => [s.date, String(s.bookings), String(s.quotes), s.revenue.toFixed(2)]);
    return [head, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
  }, [r]);

  function download() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cabslink-analytics-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Live performance from your own booking data, with every figure compared to the previous period of the same length."
      >
        <Button variant="outline" onClick={download} disabled={!r}>
          <Download className="size-4 mr-1" /> Export CSV
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex gap-1.5">
          {(["7", "30", "90"] as const).map(p => (
            <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => applyPreset(p)}>
              {p} days
            </Button>
          ))}
          <Button size="sm" variant={preset === "custom" ? "default" : "outline"} onClick={() => applyPreset("custom")}>
            Custom
          </Button>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" max={to} value={from} onChange={e => { setPreset("custom"); setFrom(e.target.value); }} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" min={from} max={isoDay(new Date())} value={to} onChange={e => { setPreset("custom"); setTo(e.target.value); }} />
        </div>
        <div>
          <Label>Group by</Label>
          <Select value={granularity} onValueChange={(v: "day" | "week" | "month") => setGranularity(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
          {q.isFetching ? "Refreshing…" : "Refresh"}
        </Button>
        {r && (
          <p className="ml-auto text-xs text-muted-foreground">
            Compared with {r.range.previousFrom} → {r.range.previousTo}
          </p>
        )}
      </div>

      {q.isError && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</div>}
      {q.isLoading && <EmptyState title="Loading analytics…" />}

      {r && k && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Revenue collected" value={money(k.revenue)} icon={PoundSterling} hint={<Delta change={k.revenueChange} />} />
            <StatCard label="Bookings" value={k.bookings} icon={BarChart3} hint={<Delta change={k.bookingsChange} />} />
            <StatCard label="Quotes priced" value={k.quotes} icon={FileSearch} hint={<Delta change={k.quotesChange} />} />
            <StatCard label="Quote → booking" value={`${k.conversion.toFixed(1)}%`} icon={Percent} hint={<Delta change={k.conversionChange} />} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Average fare" value={money(k.avgFare)} icon={Calculator} hint={<Delta change={k.avgFareChange} />} />
            <StatCard label="Completed" value={k.completed} icon={CheckCircle2} hint={<Delta change={k.completedChange} />} />
            <StatCard label="Cancelled" value={`${k.cancelled} (${k.cancelRate.toFixed(1)}%)`} icon={XCircle} accent="text-muted-foreground" hint={<Delta change={k.cancelledChange} invert />} />
            <StatCard label="Enquiries" value={k.enquiries} icon={Inbox} hint={<Delta change={k.enquiriesChange} />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Revenue collected">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={r.series}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => money(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke={GOLD} fill={GOLD} fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Demand funnel — quotes vs bookings">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={r.series}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quotes" name="Quotes" fill={NAVY} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="bookings" name="Bookings" fill={GOLD} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Vehicle class mix">
              {r.byVehicle.length === 0 ? <p className="text-sm text-muted-foreground">No bookings in this range.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={r.byVehicle} dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {r.byVehicle.map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Booking status">
              {r.byStatus.length === 0 ? <p className="text-sm text-muted-foreground">No bookings in this range.</p> : (
                <div className="space-y-2">
                  {r.byStatus.map(s => (
                    <div key={s.name} className="flex items-center gap-3 text-sm">
                      <span className="w-40 shrink-0 capitalize">{s.name.replace(/_/g, " ")}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-[var(--gold)]"
                          style={{ width: `${Math.max(3, (s.count / Math.max(...r.byStatus.map(x => x.count))) * 100)}%` }}
                        />
                      </span>
                      <span className="w-10 text-right font-semibold tabular-nums">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Service types">
              {r.byService.length === 0 ? <p className="text-sm text-muted-foreground">No bookings in this range.</p> : (
                <div className="space-y-2 text-sm">
                  {r.byService.map(s => (
                    <div key={s.name} className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="capitalize">{s.name.replace(/_/g, " ")}</span>
                      <span className="tabular-nums">{s.count} · {money(s.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Top routes booked">
              {r.byRoute.length === 0 ? <p className="text-sm text-muted-foreground">No bookings in this range.</p> : (
                <div className="space-y-2 text-sm">
                  {r.byRoute.map(s => (
                    <div key={s.name} className="flex items-start justify-between gap-3 border-b border-border pb-1.5">
                      <span className="line-clamp-2">{s.name}</span>
                      <span className="shrink-0 tabular-nums font-semibold">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel
            title="Website traffic (Google Analytics)"
            action={GA_MEASUREMENT_ID ? (
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open Google Analytics <ExternalLink className="size-3.5" />
              </a>
            ) : undefined}
          >
            <p className="text-sm text-muted-foreground">
              {GA_MEASUREMENT_ID
                ? <>Tracking is installed on every public page (measurement ID <span className="font-mono">{GA_MEASUREMENT_ID}</span>). Visitors, traffic sources and device mix live in Google Analytics; booking outcomes above come from your own data. Staff console pages are never measured, and visitors in consent-required regions are only measured after they accept.</>
                : <>Google Analytics is not connected yet, so traffic figures are unavailable. Booking analytics above are unaffected.</>}
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
