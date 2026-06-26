import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/admin.functions";
import { CalendarCheck, Inbox, Car, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

const statsOpts = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: () => getDashboardStats(),
});

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsOpts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  new: "#f59e0b",
  confirmed: "#3b82f6",
  assigned: "#8b5cf6",
  on_way: "#06b6d4",
  completed: "#10b981",
  cancelled: "#ef4444",
};

function Dashboard() {
  const { data } = useSuspenseQuery(statsOpts);
  const { totals, seriesDaily, byVehicle, byStatus, recentBookings } = data;

  const kpis = [
    { label: "Total bookings", value: totals.bookings, icon: CalendarCheck, accent: "text-[var(--gold)]" },
    { label: "Pending", value: totals.pendingBookings, icon: Clock, accent: "text-amber-500" },
    { label: "Completed", value: totals.completedBookings, icon: CheckCircle2, accent: "text-emerald-500" },
    { label: "Unread messages", value: totals.unreadMessages, icon: Inbox, accent: "text-sky-500" },
    { label: "Active vehicles", value: `${totals.vehiclesActive}/${totals.vehiclesTotal}`, icon: Car, accent: "text-fuchsia-500" },
    { label: "Last 30d trend", value: seriesDaily.reduce((s, d) => s + d.count, 0), icon: TrendingUp, accent: "text-[var(--gold)]" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of bookings, messages and fleet activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className={`size-4 ${k.accent}`} />
            </div>
            <div className="mt-2 font-display text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Bookings — last 30 days</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={seriesDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="count" stroke="var(--gold)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">By status</h2>
          <ul className="space-y-2">
            {Object.entries(byStatus).map(([s, n]) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-block size-2.5 rounded-full" style={{ background: STATUS_COLORS[s] ?? "#888" }} />
                  <span className="capitalize">{s.replace("_", " ")}</span>
                </span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
            {Object.keys(byStatus).length === 0 && <li className="text-sm text-muted-foreground">No bookings yet.</li>}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Top vehicles booked</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byVehicle.slice(0, 6)} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {byVehicle.map((_, i) => (<Cell key={i} fill="var(--gold)" />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent bookings</h2>
            <Link to="/admin/bookings" className="text-xs text-[var(--gold)] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentBookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            {recentBookings.map((b: any) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.vehicle_type} · {b.pickup_date}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ background: (STATUS_COLORS[b.status] ?? "#888") + "20", color: STATUS_COLORS[b.status] ?? "#888" }}>{b.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
