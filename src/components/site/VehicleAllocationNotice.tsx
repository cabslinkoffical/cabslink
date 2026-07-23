import { Info } from "lucide-react";

export function VehicleAllocationNotice({
  className,
  compact = false,
  models,
}: {
  className?: string;
  compact?: boolean;
  models?: { id: string; name: string; manufacturer: string | null }[];
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 text-foreground/80 p-4 text-[12.5px] leading-relaxed ${className ?? ""}`}
    >
      <div className="flex items-start gap-2.5">
        <Info className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Vehicle allocation</p>
          <p className={compact ? "mt-1" : "mt-1.5"}>
            You are booking a vehicle class, not a specific model. The exact vehicle
            provided may vary depending on operational availability. You will always
            receive a vehicle from the selected class{" "}
            <span className="font-semibold">or a complimentary upgrade</span> — never a lower class.
          </p>
          {models && models.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {models.slice(0, 6).map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center rounded-full border border-[var(--gold)]/40 bg-white/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
