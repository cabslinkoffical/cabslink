import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Settings as SettingsIcon, Clock, Inbox, AlertCircle, Sparkles } from "lucide-react";
import { SETTINGS_GROUPS } from "@/components/admin/admin-areas";

type Totals = { upcoming: number; newToday: number; unreadMessages: number; pendingAllocation: number };

/**
 * The two doors from the dashboard into the other console areas. The sidebar
 * only shows the current area's pages, so these cards are the way in.
 */
export function AreaGateway({ totals }: { totals: Totals }) {
  const bookingStats = [
    { label: "Upcoming", value: totals.upcoming, icon: Clock, to: "/cabs-booking-pannel/bookings", search: { tab: "upcoming" } },
    { label: "Booked today", value: totals.newToday, icon: Sparkles, to: "/cabs-booking-pannel/bookings", search: {} },
    { label: "Need a driver", value: totals.pendingAllocation, icon: AlertCircle, to: "/cabs-booking-pannel/bookings", search: { tab: "new" } },
    { label: "Unread messages", value: totals.unreadMessages, icon: Inbox, to: "/cabs-booking-pannel/messages", search: undefined },
  ];
  const settingCount = SETTINGS_GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Bookings & messages */}
      <section className="group relative overflow-hidden rounded-2xl bg-navy text-navy-foreground p-5 sm:p-6 ring-1 ring-gold/20 shadow-lg">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gold/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold text-navy"><CalendarCheck className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-gold">Day-to-day</p>
              <h2 className="truncate font-display text-xl font-semibold">Bookings &amp; messages</h2>
            </div>
          </div>
          <Link
            to="/cabs-booking-pannel/bookings"
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            Open <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="relative mt-3 text-sm text-navy-foreground/75">Bookings, tour enquiries, change requests, refunds, messages and driver applications.</p>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {bookingStats.map((s) => (
            <Link
              key={s.label}
              to={s.to as any}
              search={s.search as any}
              className="rounded-xl bg-navy-foreground/[0.06] p-3 ring-1 ring-navy-foreground/10 transition hover:bg-navy-foreground/[0.1] hover:ring-gold/40"
            >
              <s.icon className="size-4 text-gold" />
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-[11px] text-navy-foreground/70">{s.label}</p>
            </Link>
          ))}
        </div>
        <Link
          to="/cabs-booking-pannel/bookings"
          className="relative mt-4 flex sm:hidden items-center justify-center gap-1.5 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-navy"
        >
          Open bookings <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Settings */}
      <section className="relative overflow-hidden rounded-2xl bg-card p-5 sm:p-6 ring-1 ring-border shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gold/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-gold"><SettingsIcon className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-gold-ink">Your website</p>
              <h2 className="truncate font-display text-xl font-semibold text-foreground">Settings</h2>
            </div>
          </div>
          <Link
            to="/cabs-booking-pannel/site-settings"
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground transition hover:bg-navy-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            Open <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="relative mt-3 text-sm text-muted-foreground">{settingCount} settings: prices, vehicles, tours, content, search pages and business details.</p>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SETTINGS_GROUPS.map((g) => (
            <Link
              key={g.label}
              to="/cabs-booking-pannel/site-settings"
              hash={slug(g.label)}
              className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/60 p-3 ring-1 ring-border transition hover:bg-surface-gold hover:ring-gold/40"
            >
              <g.icon className="size-4 shrink-0 text-gold-ink" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-foreground">{g.label}</span>
                <span className="block text-[11px] text-muted-foreground">{g.items.length} pages</span>
              </span>
            </Link>
          ))}
        </div>
        <Link
          to="/cabs-booking-pannel/site-settings"
          className="relative mt-4 flex sm:hidden items-center justify-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-navy-foreground"
        >
          Open settings <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
