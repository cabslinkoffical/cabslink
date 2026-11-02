import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, LayoutDashboard, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { getDashboardStats } from "@/lib/admin.functions";
import { SETTINGS_GROUPS, type AdminAreaId } from "@/components/admin/admin-areas";
import { cn } from "@/lib/utils";

/**
 * Compact doors to the other console areas, pinned at the bottom of the left
 * panel. The Bookings tile shows what needs attention (bookings without a
 * driver + unread messages), from the same figures as the dashboard.
 */
export function AreaShortcuts({ current }: { current: AdminAreaId }) {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => getDashboardStats(), staleTime: 60_000 });
  const t = stats.data?.totals;
  const attention = t ? t.pendingAllocation + t.unreadMessages : 0;
  const settingCount = SETTINGS_GROUPS.reduce((n, g) => n + g.items.length, 0);

  const tiles = [
    { id: "dashboard" as const, to: "/cabs-booking-pannel", label: "Dashboard", hint: "Figures & reports", icon: LayoutDashboard, badge: 0 },
    {
      id: "bookings" as const, to: "/cabs-booking-pannel/bookings", label: "Bookings & messages",
      hint: t ? `${t.upcoming} upcoming · ${t.unreadMessages} unread` : "Bookings, refunds, inbox", icon: CalendarCheck, badge: attention,
    },
    { id: "settings" as const, to: "/cabs-booking-pannel/site-settings", label: "Settings", hint: `${settingCount} settings`, icon: SettingsIcon, badge: 0 },
  ].filter((x) => x.id !== current);

  return (
    <div className="shrink-0 px-3 pt-3">
      <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Go to</p>
      <div className="space-y-1.5">
        {tiles.map((x) => (
          <Link
            key={x.id}
            to={x.to as any}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 ring-1 transition",
              x.id === "bookings"
                ? "bg-gold/[0.12] ring-gold/30 hover:bg-gold/20"
                : "bg-white/[0.05] ring-white/10 hover:bg-white/[0.09]",
            )}
          >
            <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-lg", x.id === "bookings" ? "bg-gold text-navy" : "bg-white/10 text-gold")}>
              <x.icon className="size-4" />
              {x.badge > 0 && (
                <span aria-label={`${x.badge} need attention`} className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-[18px] text-destructive-foreground">
                  {x.badge > 99 ? "99+" : x.badge}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-white">{x.label}</span>
              <span className="block truncate text-[11px] text-white/60">{x.hint}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-gold" />
          </Link>
        ))}
      </div>
    </div>
  );
}
