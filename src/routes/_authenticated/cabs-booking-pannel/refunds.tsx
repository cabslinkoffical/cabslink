import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { listBookingsPage } from "@/lib/admin-bookings.functions";
import { Pager, useDebounced, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { EmptyState, ListError } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { formatTime12 } from "@/lib/time-format";
import { Search } from "lucide-react";

const refundedOpts = (q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "bookings", "page", { tab: "refunded", q, page, pageSize, includeTours: true }],
  queryFn: () => listBookingsPage({ data: { tab: "refunded", q, page, pageSize, includeTours: true } }),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: fully refunded bookings." },
      { property: "og:title", content: "Refunds — Cabslink Admin" },
      { property: "og:description", content: "Cabslink staff console: fully refunded bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(refundedOpts("", 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  component: RefundsPage,
});

const money = (v: unknown) => (v == null ? "—" : `£${Number(v).toFixed(2)}`);

function RefundsPage() {
  const [q, setQ] = useState("");
  const term = useDebounced(q.trim());
  const paging = usePageState(term);
  const listQ = useQuery(refundedOpts(term, paging.page, paging.pageSize));
  const rows = (listQ.data?.rows ?? []) as any[];
  const total = listQ.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Refunds</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bookings where the full payment was given back. They appear only here, not in other booking lists.</p>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, name, address…" className="pl-9" />
        </div>
      </header>

      {listQ.isError ? (
        <ListError error={listQ.error} onRetry={() => listQ.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No refunded bookings" hint="Fully refunded bookings collect here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Fare</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-border/70 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="whitespace-nowrap font-semibold">{b.booking_ref ?? "—"}</div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">{b.pickup_date ?? "—"} {formatTime12(b.pickup_time)} · Refunded</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[18rem]">
                    {b.tour_name ? (
                      <div className="truncate">{b.tour_name}</div>
                    ) : (
                      <>
                        <div className="truncate">{b.pickup_address ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">→ {b.dropoff_address ?? "—"}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{money(b.price ?? b.quoted_total)}</td>
                  <td className="px-4 py-3 max-w-[14rem]"><div className="truncate text-xs text-muted-foreground">{b.cancellation_reason ?? "Payment fully refunded"}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 0 && (
        <Pager page={paging.page} pageSize={paging.pageSize} total={total} noun="refunded bookings" loading={listQ.isFetching}
          onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} />
      )}
    </div>
  );
}
