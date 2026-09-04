import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, accent = "text-primary", hint,
}: {
  label: string; value: string | number; icon: LucideIcon; accent?: string; hint?: React.ReactNode;
}) {
  return (
    <div className="admin-card admin-card-hover admin-accent-top p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] leading-tight uppercase tracking-[0.14em] text-muted-foreground font-semibold">{label}</span>
        <div
          className={cn(
            "size-9 rounded-xl flex items-center justify-center bg-surface-gold ring-1 ring-gold/25 text-gold-ink",
            accent === "text-muted-foreground" && "bg-muted ring-border text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-2.5 text-2xl font-display font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Compact single-line metric for dense secondary strips. */
export function MiniStat({ label, value, icon: Icon }: { label: string; value: string | number; icon?: LucideIcon }) {
  return (
    <div className="admin-card px-3 py-2.5 flex items-center gap-2.5 min-w-0">
      {Icon && (
        <span className="size-7 shrink-0 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
          <Icon className="size-3.5" />
        </span>
      )}
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className="ml-auto text-sm font-semibold tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl md:text-[1.7rem] font-display font-semibold tracking-tight admin-title-rule">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-2.5 max-w-2xl">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}


export function StatusBadge({ status, color }: { status: string; color?: string }) {
  const gold = "bg-surface-gold text-gold-ink ring-1 ring-gold/30";
  const navy = "bg-navy text-navy-foreground ring-1 ring-navy/20";
  const soft = "bg-secondary text-foreground ring-1 ring-border";
  const palette: Record<string, string> = {
    new: gold,
    pending_allocation: gold,
    confirmed: navy,
    assigned: navy,
    on_way: gold,
    in_progress: gold,
    bidding: gold,
    completed: navy,
    paid: navy,
    active: navy,
    cancelled: soft,
    failed: soft,
    suspended: soft,
    inactive: soft,
    unpaid: gold,
    refunded: soft,
    partial: gold,
    read: navy,
    resolved: navy,
    pending: gold,
    booked: navy,
    // 'cancelled' already mapped above
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap", color ?? palette[status] ?? soft)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-16 px-4 border border-dashed border-gold/35 rounded-2xl bg-surface-gold/40">
      <p className="font-display font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
