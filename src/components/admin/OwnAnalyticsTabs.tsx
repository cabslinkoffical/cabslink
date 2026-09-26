import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard, EmptyState } from "@/components/admin/ui";
import { getOwnAnalytics } from "@/lib/own-analytics.functions";
import { GA_MEASUREMENT_ID } from "@/lib/analytics-ga";
import { Eye, Users, MousePointerClick, Activity, Repeat, LogOut, Radio, ExternalLink, ShieldCheck } from "lucide-react";

const GOLD = "#deae25";
const NAVY = "#0e182c";
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };

function List({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <div className="admin-card p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
        <div className="space-y-2 text-sm">
          {items.map(i => (
            <div key={i.name} className="flex items-center gap-3">
              <span className="w-2/5 shrink-0 truncate" title={i.name}>{i.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.max(3, (i.count / max) * 100)}%` }} />
              </span>
              <span className="w-12 text-right font-semibold tabular-nums">{i.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OwnAnalyticsTab() {
  const [preset, setPreset] = useState<"1" | "7" | "30" | "90">("30");
  const [from, setFrom] = useState(isoDay(daysAgo(29)));
  const [to, setTo] = useState(isoDay(new Date()));
  const run = useServerFn(getOwnAnalytics);
  const q = useQuery({
    queryKey: ["own-analytics", from, to],
    queryFn: () => run({ data: { from, to } }),
    refetchInterval: 60_000,
  });
  const r = q.data;
  const pick = (p: typeof preset) => { setPreset(p); setFrom(isoDay(daysAgo(Number(p) - 1))); setTo(isoDay(new Date())); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex gap-1.5">
          {(["1", "7", "30", "90"] as const).map(p => (
            <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => pick(p)}>{p === "1" ? "Today" : `${p} days`}</Button>
          ))}
        </div>
        <div><Label>From</Label><Input type="date" max={to} value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>{q.isFetching ? "Refreshing…" : "Refresh"}</Button>
        <p className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Tracked by Cabslink itself · no third party · staff pages excluded</p>
      </div>

      {q.isError && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</div>}
      {q.isLoading && <EmptyState title="Loading website analytics…" />}

      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Page views" value={r.kpi.pageViews} icon={Eye} />
            <StatCard label="Unique visitors" value={r.kpi.visitors} icon={Users} hint={r.kpi.anonymousViews ? `+ ${r.kpi.anonymousViews} views without consent (anonymous)` : undefined} />
            <StatCard label="Sessions" value={r.kpi.sessions} icon={Activity} />
            <StatCard label="Active last 5 min" value={r.kpi.liveNow} icon={Radio} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Pages per session" value={r.kpi.pagesPerSession.toFixed(2)} icon={Repeat} />
            <StatCard label="Bounce rate" value={`${r.kpi.bounceRate.toFixed(1)}%`} icon={LogOut} />
            <StatCard label="Tracked actions" value={r.kpi.events} icon={MousePointerClick} hint="Quotes, bookings, calls, WhatsApp, buttons" />
          </div>

          <div className="admin-card p-4">
            <h3 className="mb-3 font-semibold">Traffic over time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={r.series}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip /><Legend />
                <Area type="monotone" dataKey="views" name="Page views" stroke={NAVY} fill={NAVY} fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke={GOLD} fill={GOLD} fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="events" name="Actions" stroke="#6b7a94" fill="#6b7a94" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <List title="Top pages" items={r.topPages} />
            <List title="Actions taken" items={r.eventNames} />
            <List title="Where visitors came from" items={r.referrers} />
            <List title="Campaigns (UTM)" items={r.campaigns} />
            <List title="Devices" items={r.devices} />
            <List title="Browsers" items={r.browsers} />
            <List title="Operating systems" items={r.os} />
            <List title="Countries" items={r.countries} />
          </div>

          <div className="admin-card p-4">
            <h3 className="mb-3 font-semibold">Latest activity</h3>
            {r.recent.length === 0 ? <p className="text-sm text-muted-foreground">No visits recorded yet — data appears as soon as people browse the live site.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5">Time</th><th>Type</th><th>Page</th><th>Device</th><th>Country</th><th>From</th></tr></thead>
                  <tbody>
                    {r.recent.map((e, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5 whitespace-nowrap">{new Date(e.at).toLocaleString("en-GB")}</td>
                        <td>{e.kind === "pageview" ? "View" : e.name.replace(/_/g, " ")}</td>
                        <td className="max-w-xs truncate">{e.path}</td>
                        <td>{e.device ?? "—"}</td><td>{e.country ?? "—"}</td><td>{e.referrer ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {r.truncated && <p className="text-xs text-muted-foreground">Showing the first 60,000 records in this range — pick a shorter range for full detail.</p>}
        </>
      )}
    </div>
  );
}

const GA_LINKS = [
  { label: "Realtime", href: "https://analytics.google.com/analytics/web/#/realtime" },
  { label: "Reports overview", href: "https://analytics.google.com/analytics/web/#/reports/reportinghub" },
  { label: "Traffic acquisition", href: "https://analytics.google.com/analytics/web/#/reports/explorer?params=_u..nav%3Dmaui&r=lifecycle-traffic-acquisition-v2" },
  { label: "Pages and screens", href: "https://analytics.google.com/analytics/web/#/reports/explorer?r=all-pages-and-screens" },
  { label: "Events", href: "https://analytics.google.com/analytics/web/#/reports/explorer?r=top-events" },
  { label: "Explorations / funnels", href: "https://analytics.google.com/analytics/web/#/analysis" },
];

export function GoogleAnalyticsTab() {
  return (
    <div className="space-y-4">
      <div className="admin-card p-5">
        <h3 className="font-semibold">Google Analytics 4</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {GA_MEASUREMENT_ID
            ? <>Connected and installed on every public page (measurement ID <span className="font-mono">{GA_MEASUREMENT_ID}</span>). Page views and the same actions tracked in the "Own analytics" tab are sent to Google. Staff pages are never measured, and visitors in consent-required regions are measured only after accepting cookies.</>
            : <>Google Analytics is not connected, so nothing is sent to Google. Your own analytics keep working.</>}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Google keeps its reports inside Google Analytics itself, so open them with the shortcuts below (sign in with the Google account that owns the property).</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GA_LINKS.map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="admin-card flex items-center justify-between p-4 text-sm font-medium hover:border-[var(--gold)]">
            {l.label} <ExternalLink className="size-4 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}
