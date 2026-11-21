import { formatTime12 } from "@/lib/time-format";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { listCancellationRequestsPage } from "@/lib/admin-lists.functions";
import { listBookingsPage } from "@/lib/admin-bookings.functions";
import { Pager, useDebounced, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { updateCancellationRequest } from "@/lib/admin.functions";
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
import { Search, Phone, Mail, MapPin, CalendarClock, CircleSlash2, ChevronRight, History, Wallet } from "lucide-react";
import { toast } from "sonner";
import { RefundsList } from "@/components/admin/RefundsList";

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
  validateSearch: (s: Record<string, unknown>): { section?: "refunds" } => (s["section"] === "refunds" ? { section: "refunds" } : {}),
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

function Pill({ status, unpaid }: { status: string; unpaid?: boolean }) {
  const label = unpaid && status === "completed" ? "Cancelled" : STATUS_LABELS[status as Status] ?? status;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.completed}`}>
      {label}
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

type QueueView = "open" | "approved" | "refunded" | "closed" | "all";

const UNPAID_STATUSES: Status[] = ["pending", "in_review", "completed", "declined"];
const UNPAID_LABELS: Partial<Record<Status, string>> = {
  pending: "Pending",
  in_review: "In review",
  completed: "Cancelled — closed",
  declined: "Declined — booking kept",
};

function SectionTabs({ section }: { section: "cancellations" | "refunds" }) {
  const navigate = Route.useNavigate();
  const items = [
    { id: "cancellations" as const, label: "Cancellations (paid & unpaid)" },
    { id: "refunds" as const, label: "Refunds" },
  ];
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit" role="tablist" aria-label="Section">
      {items.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={section === t.id}
          onClick={() => navigate({ search: t.id === "refunds" ? { section: "refunds" } : {} })}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${section === t.id ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CancellationsPage() {
  const section = Route.useSearch().section === "refunds" ? "refunds" : "cancellations";
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "cancellations"] });
    qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const upd = useMutation({
    mutationFn: useServerFn(updateCancellationRequest),
    onSuccess: (r: any) => { invalidate(); toast.success(r?.bookingCancelled ? "Saved — booking cancelled and customer emailed" : "Request updated"); if (r?.refundNote) toast.info(r.refundNote); },
    onError: (e: any) => toast.error(e.message),
  });

  const [group, setGroup] = useState<Group>("paid");
  const [tab, setTab] = useState<QueueView>("open");
  const [q, setQ] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const term = useDebounced(q.trim());
  const paging = usePageState([group, tab, term]);
  const listQ = useQuery(cancelOpts(group, tab, term, paging.page, paging.pageSize));
  const rows = (listQ.data?.rows ?? []) as any[];
  const groups: Record<Group, Record<string, number>> = (listQ.data as any)?.groups ?? { paid: {}, unpaid: {} };
  const counts = groups[group] ?? {};
  const refundDue = listQ.data?.refundDue ?? 0;
  const unpaid = group === "unpaid";

  const switchGroup = (g: Group) => { setGroup(g); setTab("open"); setOpenId(null); };

  const [openId, setOpenId] = useState<string | null>(null);
  const active = rows.find((r) => r.id === openId) ?? null;
  const activeUnpaid = active?.refund_tier === "unpaid";

  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [alsoCancel, setAlsoCancel] = useState(true);

  useEffect(() => {
    if (!active) return;
    setNotes(active.admin_notes ?? "");
    setAmount(active.refund_amount == null ? "" : String(active.refund_amount));
    setStatus((active.status ?? "pending") as Status);
    setAlsoCancel(true);
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!active) return;
    upd.mutate({
      data: {
        id: active.id,
        status,
        admin_notes: notes.trim() || null,
        ...(activeUnpaid ? {} : { refund_amount: amount.trim() === "" ? null : Number(amount) }),
        cancel_booking: alsoCancel,
      },
    } as any);
  };

  const queueViews: Array<{ value: QueueView; label: string; count: number }> = unpaid
    ? [
        { value: "open", label: "Needs action", count: counts.open ?? 0 },
        { value: "closed", label: "Cancelled", count: counts.closed ?? 0 },
        { value: "all", label: "All", count: counts.all ?? 0 },
      ]
    : [
        { value: "open", label: "Needs review", count: counts.open ?? 0 },
        { value: "approved", label: "Refund approved", count: counts.approved ?? 0 },
        { value: "closed", label: "Closed", count: counts.closed ?? 0 },
        { value: "all", label: "All", count: counts.all ?? 0 },
      ];

  const quickUpdate = (id: string, nextStatus: Status, cancel?: boolean) => {
    upd.mutate({ data: { id, status: nextStatus, ...(cancel ? { cancel_booking: true } : {}) } } as any);
  };

  const groupCards: Array<{ value: Group; title: string; hint: string; icon: typeof Wallet; open: number; total: number; extra: string }> = [
    { value: "paid", title: "Paid & cancelled", hint: "Customer paid — review and refund", icon: Wallet, open: groups.paid?.open ?? 0, total: groups.paid?.all ?? 0, extra: `${money(refundDue)} approved, not yet refunded` },
    { value: "unpaid", title: "Unpaid & cancelled", hint: "No payment taken — cancelled automatically", icon: CircleSlash2, open: groups.unpaid?.open ?? 0, total: groups.unpaid?.all ?? 0, extra: `${groups.unpaid?.closed ?? 0} closed` },
  ];

  const pageHeader = (
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cancellations & Refunds</h1>
          <p className="mt-1 text-sm text-muted-foreground">Paid cancellations need a refund decision. Unpaid ones close automatically and the customer is emailed.</p>
        </div>
        <Button variant="outline" onClick={() => setHistoryOpen(true)} className="shrink-0">
          <History className="size-4" /> Cancellation history
        </Button>
      </header>
  );

  if (section === "refunds") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <SectionTabs section="refunds" />
        <RefundsList />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}
      <SectionTabs section="cancellations" />

      <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Cancellation type">
        {groupCards.map(({ value, title, hint, icon: Icon, open, total, extra }) => {
          const on = group === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => switchGroup(value)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${on ? "border-primary bg-navy text-navy-foreground shadow-[var(--shadow-card)]" : "border-border bg-card hover:bg-muted/40"}`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${on ? "bg-gold text-navy" : "bg-muted text-gold-ink"}`}><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-semibold">{title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${open ? (on ? "bg-gold text-navy" : "bg-warning/15 text-warning") : (on ? "bg-navy-foreground/15" : "bg-muted text-muted-foreground")}`}>{open} need action</span>
                </span>
                <span className={`mt-0.5 block text-xs ${on ? "text-navy-foreground/75" : "text-muted-foreground"}`}>{hint}</span>
                <span className={`mt-2 block text-xs tabular-nums ${on ? "text-navy-foreground/75" : "text-muted-foreground"}`}>{total} total · {extra}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto" role="tablist" aria-label="Request status">
            {queueViews.map((view) => (
              <Button key={view.value} size="sm" variant={tab === view.value ? "navy" : "ghost"} role="tab" aria-selected={tab === view.value} onClick={() => setTab(view.value)}>
                {view.label} <span className="tabular-nums opacity-70">{view.count}</span>
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, customer or address" className="pl-9" />
          </div>
        </div>

        {listQ.isError ? (
          <div className="p-6"><ListError error={listQ.error} onRetry={() => listQ.refetch()} /></div>
        ) : rows.length === 0 ? (
          <div className="p-6"><EmptyState title="Nothing here" hint={unpaid ? "Unpaid cancellations appear here once customers cancel." : "Try another status or clear your search."} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Booking</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Pickup</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">{unpaid ? "Fare" : "Refund"}</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-t border-border/70 align-top hover:bg-muted/40" onClick={() => setOpenId(r.id)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.booking_ref}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">Asked {dt(r.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customer_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email ?? r.phone ?? "No contact details"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-foreground">{r.pickup_date ?? "—"} {formatTime12(r.pickup_time)}</div>
                      {r.hours_until_pickup != null && <div className="text-muted-foreground">{r.hours_until_pickup}h notice</div>}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3">
                      <div className="line-clamp-2">{r.reason}</div>
                    </td>
                    <td className="px-4 py-3">
                      {unpaid ? (
                        <>
                          <div className="font-semibold tabular-nums">{money(r.price_at_request)}</div>
                          <div className="text-xs text-muted-foreground">No payment taken</div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold tabular-nums">{money(r.refund_amount ?? r.price_at_request)}</div>
                          <div className="text-xs text-muted-foreground">{TIER_LABELS[r.refund_tier] ?? r.refund_tier}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3"><Pill status={r.status} unpaid={r.refund_tier === "unpaid"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        {unpaid && (r.status === "pending" || r.status === "in_review") && (
                          <Button size="sm" variant="gold" disabled={upd.isPending} onClick={() => quickUpdate(r.id, "completed", true)}>Cancel booking</Button>
                        )}
                        {!unpaid && r.status === "pending" && <Button size="sm" variant="outline" onClick={() => quickUpdate(r.id, "in_review")}>Mark reviewing</Button>}
                        {!unpaid && r.status === "in_review" && <Button size="sm" variant="gold" onClick={() => quickUpdate(r.id, "approved")}>Approve</Button>}
                        <Button size="sm" variant="navy" onClick={() => setOpenId(r.id)}>Open <ChevronRight className="size-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(listQ.data?.total ?? 0) > 0 && (
          <div className="border-t border-border p-3">
            <Pager page={paging.page} pageSize={paging.pageSize} total={listQ.data?.total ?? 0} noun="requests" loading={listQ.isFetching}
              onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} className="border-0 bg-transparent px-0 py-0" />
          </div>
        )}
      </section>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><History className="size-4" /> Cancellation history</SheetTitle></SheetHeader>
          <div className="mt-4">{historyOpen && <CancelledBookings />}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  {active.booking_ref}
                  <Pill status={active.status} unpaid={activeUnpaid} />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Journey</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold-ink" />{active.pickup_address ?? "—"}</div>
                    <div className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{active.dropoff_address ?? "—"}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" />
                    {active.pickup_date ?? "—"} {formatTime12(active.pickup_time)}
                    {active.hours_until_pickup != null && <span>· {active.hours_until_pickup}h notice</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Fact label="Payment" value={activeUnpaid ? "No payment taken" : TIER_LABELS[active.refund_tier] ?? active.refund_tier} />
                  <Fact label="Fare on file" value={money(active.price_at_request)} />
                  <Fact label="Requested" value={dt(active.created_at)} />
                  <Fact label="Last actioned" value={dt(active.handled_at)} />
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Customer</div>
                  <div className="mt-2 text-sm font-medium">{active.customer_name ?? "—"}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    {active.email && <a className="inline-flex items-center gap-1.5 underline" href={`mailto:${active.email}`}><Mail className="size-3.5" />{active.email}</a>}
                    {(active.callback_phone || active.phone) && <a className="inline-flex items-center gap-1.5 underline" href={`tel:${active.callback_phone || active.phone}`}><Phone className="size-3.5" />{active.callback_phone || active.phone}</a>}
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Reason given</div>
                  <div className="mt-1 text-sm font-medium">{active.reason}</div>
                  {active.details && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{active.details}</p>}
                </div>

                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Decision</div>
                  <div className={`grid gap-3 ${activeUnpaid ? "" : "sm:grid-cols-2"}`}>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(activeUnpaid ? UNPAID_STATUSES : STATUSES).map((s) => (
                            <SelectItem key={s} value={s}>{activeUnpaid ? UNPAID_LABELS[s] : STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!activeUnpaid && (
                      <div>
                        <Label className="text-xs" htmlFor="refund-amount">Refund amount (£)</Label>
                        <Input id="refund-amount" className="mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(active.price_at_request ?? "0.00")} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor="admin-notes">Internal notes</Label>
                    <Textarea id="admin-notes" className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was agreed, refund reference, who approved it…" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={alsoCancel} onChange={(e) => setAlsoCancel(e.target.checked)} />
                    Cancel the booking when {activeUnpaid ? "closed" : "approved, refunded or closed"}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {activeUnpaid
                      ? "No payment was taken, so there is nothing to refund. Closing cancels the booking; Declined keeps it active."
                      : "Approved cancels the booking. Refunded also sends the money back to the customer's card through Stripe (full fare if the amount is blank). Declined keeps the booking active."}
                  </p>
                  <Button onClick={save} disabled={upd.isPending} className="w-full">{upd.isPending ? "Saving…" : "Save decision"}</Button>
                </div>

                {active.booking_id && (
                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Reply to customer</div>
                    <CannedEmailComposer
                      scope="booking"
                      targetId={active.booking_id}
                      vars={{ name: active.customer_name, ref: active.booking_ref, pickup: active.pickup_address, dropoff: active.dropoff_address, date: active.pickup_date, time: active.pickup_time, reason: active.reason }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}


/** Every booking that ended up cancelled or rejected, wherever it was cancelled from. */
function CancelledBookings() {
  const [q, setQ] = useState("");
  const term = useDebounced(q.trim());
  const paging = usePageState(term);
  const histQ = useQuery(cancelledBookingOpts(term, paging.page, paging.pageSize));
  const rows = (histQ.data?.rows ?? []) as any[];

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
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
                    <div className="whitespace-nowrap font-semibold">{b.booking_ref ?? "—"}</div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">
                      {b.pickup_date ?? "—"} {formatTime12(b.pickup_time)} · {b.status === "rejected" ? "Rejected" : "Cancelled"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[18rem]">
                    {b.tour_name ? (
                      <>
                        <div className="truncate">{b.tour_name}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.service_type === "hourly" ? "Hourly hire" : "Private tour"}</div>
                      </>
                    ) : (
                      <>
                        <div className="truncate">{b.pickup_address ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">→ {b.dropoff_address ?? "—"}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">{b.price != null ? money(b.price) : b.quoted_total != null ? money(b.quoted_total) : "Not quoted"}</td>
                  <td className="px-4 py-3 max-w-[14rem]">
                    <div className="truncate text-xs text-muted-foreground">{b.cancellation_reason ?? "Not recorded"}</div>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${!b.payment_status || b.payment_status === "unpaid" ? "text-destructive" : ""}`}>{!b.payment_status || b.payment_status === "unpaid" ? "Not paid" : b.payment_status === "refunded" ? "Refunded" : b.payment_status === "partial" ? "Part paid" : b.payment_status === "paid" ? "Paid" : b.payment_status}</td>
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
