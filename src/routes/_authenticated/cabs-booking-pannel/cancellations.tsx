import { formatTime12 } from "@/lib/time-format";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { listCancellationRequestsPage } from "@/lib/admin-lists.functions";
import { listBookingsPage } from "@/lib/admin-bookings.functions";
import { Pager, useDebounced, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  updateCancellationRequest,
  deleteCancellationRequest,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, ListError } from "@/components/admin/ui";
import { CannedEmailComposer } from "@/components/admin/CannedEmailComposer";
import {
  Search, Trash2, Phone, Mail, MapPin, CalendarClock, BadgePoundSterling,
  CircleSlash2, Clock, ShieldCheck, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type Group = "paid" | "unpaid";
const cancelOpts = (group: Group, view: string, q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "cancellations", { group, view, q, page, pageSize }],
  queryFn: () => listCancellationRequestsPage({ data: { group, view, q, page, pageSize } }),
  placeholderData: keepPreviousData,
});

const cancelledBookingOpts = (q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "bookings", "page", { tab: "cancelled", q, page, pageSize, includeTours: true }],
  queryFn: () => listBookingsPage({ data: { tab: "cancelled", q, page, pageSize, includeTours: true } }),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/cancellations")({
  head: () => ({
    meta: [
      { title: "Cancellations & Refunds — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: cancellation and refund requests." },
      { property: "og:title", content: "Cancellations & Refunds — Cabslink Admin" },
      { property: "og:description", content: "Cabslink staff console: cancellation and refund requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cancelOpts("paid", "open", "", 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: CancellationsPage,
});

const STATUSES = ["pending", "in_review", "approved", "refunded", "declined", "completed"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Refund approved",
  refunded: "Refunded",
  declined: "Declined",
  completed: "Closed",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  in_review: "bg-info/15 text-info border-info/30",
  approved: "bg-primary/15 text-primary border-primary/30",
  refunded: "bg-success/15 text-success border-success/30",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const TIER_LABELS: Record<string, string> = {
  unpaid: "No payment taken",
  full: "Full refund due",
  partial: "Partial claim",
  no_refund: "Non-refundable — no refund due",
  none: "Manual review",
};

const money = (v: unknown) => (v == null ? "—" : `£${Number(v).toFixed(2)}`);
const dt = (v: unknown) => (v ? new Date(String(v)).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

function Pill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.completed}`}>
      {STATUS_LABELS[status as Status] ?? status}
    </span>
  );
}

function Fact({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}

__PAGE__

/** Every booking that ended up cancelled or rejected, wherever it was cancelled from. */
function CancelledBookings() {
  const [q, setQ] = useState("");
  const term = useDebounced(q.trim());
  const paging = usePageState(term);
  const histQ = useQuery(cancelledBookingOpts(term, paging.page, paging.pageSize));
  const rows = (histQ.data?.rows ?? []) as any[];

  return (
    <section id="cancelled-bookings-history" className="scroll-mt-6 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Cancelled bookings history</h2>
          <p className="text-sm text-muted-foreground">
            Every booking that has been cancelled or rejected, whether the customer asked or your team did it.
          </p>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, name, address…" className="pl-9" />
        </div>
      </div>

      {histQ.isError ? (
        <ListError error={histQ.error} onRetry={() => histQ.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No cancelled bookings" hint="Cancelled and rejected bookings collect here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Fare</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-border/70 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{b.booking_ref ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.pickup_date ?? "—"} {formatTime12(b.pickup_time)} · {b.status === "rejected" ? "Rejected" : "Cancelled"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[18rem]">
                    <div className="truncate">{b.pickup_address ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">→ {b.dropoff_address ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">{money(b.price)}</td>
                  <td className="px-4 py-3 max-w-[14rem]">
                    <div className="truncate text-xs text-muted-foreground">{b.cancellation_reason ?? "—"}</div>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${!b.payment_status || b.payment_status === "unpaid" ? "text-destructive" : ""}`}>{b.payment_status ?? "unpaid"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(histQ.data?.total ?? 0) > 0 && (
        <Pager page={paging.page} pageSize={paging.pageSize} total={histQ.data?.total ?? 0} noun="cancelled bookings" loading={histQ.isFetching}
          onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} />
      )}
    </section>
  );
}
