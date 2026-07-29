import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, accent = "text-primary", hint,
}: {
  label: string; value: string | number; icon: LucideIcon; accent?: string; hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className={cn("size-8 rounded-lg flex items-center justify-center bg-muted/50", accent)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status, color }: { status: string; color?: string }) {
  const palette: Record<string, string> = {
    new: "bg-warning/12 text-warning",
    pending_allocation: "bg-warning/12 text-warning",
    confirmed: "bg-info/12 text-info",
    assigned: "bg-info/12 text-info",
    on_way: "bg-info/12 text-info",
    in_progress: "bg-info/12 text-info",
    bidding: "bg-info/12 text-info",
    completed: "bg-success/12 text-success",
    paid: "bg-success/12 text-success",
    active: "bg-success/12 text-success",
    cancelled: "bg-destructive/12 text-destructive",
    failed: "bg-destructive/12 text-destructive",
    suspended: "bg-destructive/12 text-destructive",
    inactive: "bg-muted text-muted-foreground",
    unpaid: "bg-warning/12 text-warning",
    refunded: "bg-muted text-muted-foreground",
    partial: "bg-warning/12 text-warning",
    read: "bg-info/12 text-info",
    resolved: "bg-success/12 text-success",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize whitespace-nowrap", color ?? palette[status] ?? "bg-muted text-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-card/50">
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
