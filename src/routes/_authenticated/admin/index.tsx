import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/admin.functions";
import {
  CalendarCheck, Car, Clock, CheckCircle2, Ban, UserCog, Users,
  CreditCard, TrendingUp, Wallet, AlertCircle, Activity, Tag, X, MapPin,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { StatCard, PageHeader, StatusBadge } from "@/components/admin/ui";
import { LegalReadinessBanner } from "@/components/admin/LegalReadinessBanner";

const statsOpts = queryOptions({ queryKey: ["admin", "stats"], queryFn: () => getDashboardStats() });

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsOpts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  new: "#f59e0b", pending_allocation: "#f59e0b",
  confirmed: "#3b82f6", assigned: "#8b5cf6",
  on_way: "#06b6d4", in_progress: "#06b6d4",
  completed: "#10b981", cancelled: "#ef4444", bidding: "#d946ef",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function Dashboard() {
  const { data } = useSuspenseQuery(statsOpts);
  const { totals, seriesDaily, monthly, byVehicle, byStatus, topPickups, topDropoffs, recentBookings } = data;

  const kpis = [
    { label: "Total Cars", value: totals.vehiclesTotal, icon: Car, accent: "text-info" },
    { label: "Total Bookings", value: totals.bookings, icon: CalendarCheck, accent: "text-primary" },
    { label: "Upcoming", value: totals.upcoming, icon: Clock, accent: "text-warning" },
    { label: "Completed", value: totals.completed, icon: CheckCircle2, accent: "text-success" },
    { label: "Cancelled", value: totals.cancelled, icon: Ban, accent: "text-destructive" },
    { label: "Pending Allocation", value: totals.pendingAllocation, icon: AlertCircle, accent: "text-warning" },
    { label: "Allocated", value: totals.allocated, icon: UserCog, accent: "text-info" },
    { label: "In Progress", value: totals.inProgress, icon: Activity, accent: "text-info" },
    { label: "Bidding", value: totals.bidding, icon: Tag, accent: "text-info" },
    { label: "Deleted", value: totals.deleted, icon: X, accent: "text-muted-foreground" },
    { label: "Total Revenue", value: fmt(totals.totalRevenue), icon: Wallet, accent: "text-success" },
    { label: "Today's Revenue", value: fmt(totals.todayRevenue), icon: TrendingUp, accent: "text-success" },
    { label: "Monthly Revenue", value: fmt(totals.monthRevenue), icon: TrendingUp, accent: "text-success" },
    { label: "Pending Payments", value: fmt(totals.pendingPayments), icon: CreditCard, accent: "text-warning" },
    { label: "Active Drivers", value: totals.driversActive, icon: UserCog, accent: "text-info" },
    { label: "Active Customers", value: totals.customersActive, icon: Users, accent: "text-info" },
    { label: "New Bookings Today", value: totals.newToday, icon: CalendarCheck, accent: "text-primary" },
  ];

  const pieData = Object.entries(byStatus).map(([name, value]) => ({ name: name.replace(/_/g, " "), value, fill: STATUS_COLORS[name] ?? "#94a3b8" }));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Dashboard" description="Real-time overview of CabsLink operations." />
      <LegalReadinessBanner />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-1">Bookings — last 30 days</h2>
          <p className="text-xs text-muted-foreground mb-4">Daily booking creation trend.</p>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={seriesDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Booking Status</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="size-2 rounded-full" style={{ background: d.fill }} />
                <span className="capitalize truncate">{d.name}</span>
                <span className="ml-auto font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Revenue — last 6 months</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmt(Number(v))} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Most Booked Vehicles</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byVehicle.slice(0, 6)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <ListCard title="Top Pickup Locations" icon={MapPin} items={topPickups} />
        <ListCard title="Top Dropoff Locations" icon={MapPin} items={topDropoffs} />
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentBookings.length === 0 && <p className="text-sm text-muted-foreground py-4">No bookings yet.</p>}
            {recentBookings.map((b: any) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.customer_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{b.booking_ref} · {b.vehicle_type}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListCard({ title, icon: Icon, items }: { title: string; icon: any; items: { name: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon className="size-4 text-primary" /> {title}</h2>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {items.map(item => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate flex-1">{item.name}</span>
            <span className="text-xs font-semibold text-primary tabular-nums">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
