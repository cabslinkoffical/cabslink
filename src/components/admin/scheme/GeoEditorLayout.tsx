import type { ReactNode } from "react";

/**
 * ONE shared layout for every map-based rule editor in the Pricing Scheme UI.
 * Desktop: fields left, large interactive map right. Mobile: fields first,
 * map below.
 */
export function GeoEditorLayout({
  title,
  description,
  fields,
  map,
  footer,
}: {
  title: string;
  description?: string;
  fields: ReactNode;
  map: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="p-5 space-y-4 lg:border-r border-border">{fields}</div>
        <div className="p-5 bg-muted/30">{map}</div>
      </div>
      {footer && <div className="border-t border-border px-5 py-3 bg-muted/20">{footer}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SchemeSection({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex-1" />
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
