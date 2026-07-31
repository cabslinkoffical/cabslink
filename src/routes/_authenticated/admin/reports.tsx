import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReports } from "@/lib/admin.functions";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Download, BarChart3, TrendingUp, CheckCircle2, XCircle, PoundSterling, Calculator } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/admin/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: reports." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const today = new Date();
  const thirtyAgo = new Date(); thirtyAgo.setDate(today.getDate() - 29);
  const [from, setFrom] = useState(isoDay(thirtyAgo));
  const [to, setTo] = useState(isoDay(today));
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const run = useServerFn(getReports);
  const mut = useMutation({ mutationFn: () => run({ data: { from: new Date(from).toISOString(), to: new Date(to + "T23:59:59").toISOString(), granularity } }), onError: (e: any) => toast.error(e.message) });

  useEffect(() => { mut.mutate(); /* eslint-disable-next-line */ }, []);

  const r = mut.data;
  const kpi = r?.kpi;

  const csv = useMemo(() => {
    if (!r) return "";
    const rows = [["Metric", "Value"],
      ["Revenue", String(kpi!.revenue)],
      ["Bookings", String(kpi!.bookings)],
      ["Completed", String(kpi!.completed)],
      ["Cancelled", String(kpi!.cancelled)],
      ["Avg fare", kpi!.avgFare.toFixed(2)],
    ];
    return rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  }, [r, kpi]);

  function download() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cabslink-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Reports" description="Revenue, bookings, vehicle and route insights.">
        <Button variant="outline" onClick={download} disabled={!r}><Download className="size-4 mr-1" /> Export CSV</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 items-end p-4 border border-border rounded-xl bg-card">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <div>
          <Label>Granularity</Label>
          <Select value={granularity} onValueChange={(v: any) => setGranularity(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="month">Month</SelectItem></SelectContent>
          </Select>
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Running…" : "Run report"}</Button>
      </div>

      {!r && !mut.isPending && <EmptyState title="Set a date range and run a report" />}

      {r && kpi && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Revenue" value={`£${kpi.revenue.toFixed(2)}`} icon={PoundSterling} accent="text-success" />
            <StatCard label="Bookings" value={kpi.bookings} icon={BarChart3} />
            <StatCard label="Completed" value={kpi.completed} icon={CheckCircle2} accent="text-success" />
            <StatCard label="Cancelled" value={kpi.cancelled} icon={XCircle} accent="text-destructive" />
            <StatCard label="Cancel rate" value={`${(kpi.cancellationRate * 100).toFixed(1)}%`} icon={TrendingUp} />
            <StatCard label="Avg fare" value={`£${kpi.avgFare.toFixed(2)}`} icon={Calculator} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Revenue</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={r.revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Bookings</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={r.bookingsSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#0e182c" />
                  <Bar dataKey="cancelled" stackId="a" fill="#deae25" />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Top vehicles</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={r.topVehicles} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Top routes</h3>
              <div className="space-y-2">
                {r.topRoutes.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
                {r.topRoutes.map((row: any) => (
                  <div key={row.route} className="flex justify-between text-sm border-b border-border pb-1.5">
                    <span className="truncate mr-2">{row.route}</span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
