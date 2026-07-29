import { CarFront } from "lucide-react";

type DrivingCarBadgeProps = {
  label: string;
  className?: string;
};

/**
 * Simple eyebrow badge: a gold vehicle icon chip, the label, and a short gold rule.
 */
export function DrivingCarBadge({ label, className }: DrivingCarBadgeProps) {
  return (
    <div className={`inline-flex w-fit max-w-full items-center gap-3 ${className ?? ""}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--gold)]/35 bg-[var(--gold)]/12 text-[var(--gold)]">
        <CarFront className="size-4" />
      </span>

      <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90">
        {label}
      </span>

      <span aria-hidden className="hidden sm:block h-px w-10 shrink-0 bg-[var(--gold)]/50" />
    </div>
  );
}

export default DrivingCarBadge;
