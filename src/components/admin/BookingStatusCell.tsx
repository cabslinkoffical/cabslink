import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { StatusBadge } from "./ui";
import { cn } from "@/lib/utils";

/** Keep booking and payment state together, without duplicate price badges. */
export function BookingStatusCell({ status, paymentStatus, locked, children }: {
  status: string;
  paymentStatus?: string | null;
  locked: boolean;
  children?: ReactNode;
}) {
  const payment = paymentStatus ?? "unpaid";
  const needsAttention = ["unpaid", "failed"].includes(payment);
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {children ?? <StatusBadge status={status} />}
      <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium capitalize", needsAttention ? "text-destructive" : "text-muted-foreground")}>
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
        {payment.replace(/_/g, " ")}
      </span>
      {locked && (
        <span role="img" aria-label="Status locked" title="Status locked" className="inline-flex shrink-0 text-muted-foreground">
          <LockKeyhole aria-hidden="true" className="size-3" />
        </span>
      )}
    </div>
  );
}