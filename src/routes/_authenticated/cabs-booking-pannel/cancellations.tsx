import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  listCancellationRequests,
  updateCancellationRequest,
  deleteCancellationRequest,
  listBookings,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, MiniStat, EmptyState } from "@/components/admin/ui";
import { CannedEmailComposer } from "@/components/admin/CannedEmailComposer";
import {
  Search, Eye, Trash2, Phone, Mail, MapPin, CalendarClock, BadgePoundSterling,
  CircleSlash2, Clock, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({
  queryKey: ["admin", "cancellations"],
  queryFn: () => listCancellationRequests(),
});

const cancelledBookingOpts = queryOptions({
  queryKey: ["admin", "bookings"],
  queryFn: () => listBookings(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/cancellations")({
  head: () => ({
    meta: [
      { title: "Cancellations & Refunds — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: cancellation and refund requests." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
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

function CancellationsPage() {
  const { data } = useSuspenseQuery(opts);
  const rowsAll = (data ?? []) as any[];
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "cancellations"] });
    qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const upd = useMutation({
    mutationFn: useServerFn(updateCancellationRequest),
    onSuccess: () => { invalidate(); toast.success("Request updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteCancellationRequest),
    onSuccess: () => { invalidate(); toast.success("Request removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [tab, setTab] = useState<"open" | Status | "all">("open");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rowsAll.length, open: 0 };
    for (const r of rowsAll) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (r.status === "pending" || r.status === "in_review") c.open += 1;
    }
    return c;
  }, [rowsAll]);

  const refundDue = useMemo(
    () => rowsAll
      .filter((r) => r.status === "approved")
      .reduce((s, r) => s + Number(r.refund_amount ?? r.price_at_request ?? 0), 0),
    [rowsAll],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rowsAll.filter((r) => {
      if (tab === "open" && !(r.status === "pending" || r.status === "in_review")) return false;
      if (tab !== "open" && tab !== "all" && r.status !== tab) return false;
      if (!term) return true;
      return [r.booking_ref, r.customer_name, r.email, r.phone, r.reason, r.pickup_address, r.dropoff_address]
        .some((f) => String(f ?? "").toLowerCase().includes(term));
    });
  }, [rowsAll, tab, q]);

  const [openId, setOpenId] = useState<string | null>(null);
  const active = rowsAll.find((r) => r.id === openId) ?? null;

  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [alsoCancel, setAlsoCancel] = useState(false);

  useEffect(() => {
    if (!active) return;
    setNotes(active.admin_notes ?? "");
    setAmount(active.refund_amount == null ? "" : String(active.refund_amount));
    setStatus((active.status ?? "pending") as Status);
    setAlsoCancel(false);
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!active) return;
    upd.mutate({
      data: {
        id: active.id,
        status,
        admin_notes: notes.trim() || null,
        refund_amount: amount.trim() === "" ? null : Number(amount),
        cancel_booking: alsoCancel,
      },
    } as any);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cancellations & Refunds"
        description="Every customer cancellation or refund request lands here with the full booking detail, so you can approve, refund or decline it."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Open requests" value={counts.open ?? 0} icon={Clock} />
        <MiniStat label="Refund approved" value={counts.approved ?? 0} icon={ShieldCheck} />
        <MiniStat label="Refunded" value={counts.refunded ?? 0} icon={BadgePoundSterling} />
        <MiniStat label="Approved value" value={money(refundDue)} icon={BadgePoundSterling} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="open">Open ({counts.open ?? 0})</TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>{STATUS_LABELS[s]} ({counts[s] ?? 0})</TabsTrigger>
            ))}
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, name, email…" className="pl-9" />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No cancellation requests here" hint="Requests submitted from the Manage Booking page appear in this list." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/70 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.booking_ref}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.pickup_date ?? "—"} {r.pickup_time ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[16rem]">
                    <div className="truncate">{r.reason}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium">{TIER_LABELS[r.refund_tier] ?? r.refund_tier}</div>
                    <div className="text-xs text-muted-foreground">
                      {money(r.refund_amount ?? r.price_at_request)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{dt(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={r.status}
                      onValueChange={(v) => upd.mutate({ data: { id: r.id, status: v } } as any)}
                    >
                      <SelectTrigger className="h-8 w-[9.5rem] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Open request" onClick={() => setOpenId(r.id)}>
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete request"
                        onClick={() => { if (confirm(`Remove the cancellation request for ${r.booking_ref}?`)) del.mutate({ data: { id: r.id } } as any); }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CancelledBookings />

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <CircleSlash2 className="size-4" />
                  {active.booking_ref}
                  <Pill status={active.status} />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Journey</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex gap-2"><MapPin className="mt-0.5 size-4 text-primary shrink-0" />{active.pickup_address ?? "—"}</div>
                    <div className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{active.dropoff_address ?? "—"}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" />
                    {active.pickup_date ?? "—"} {active.pickup_time ?? ""}
                    {active.hours_until_pickup != null && <span>· {active.hours_until_pickup}h notice</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Fact label="Refund entitlement" value={TIER_LABELS[active.refund_tier] ?? active.refund_tier} />
                  <Fact label="Fare on file" value={`${money(active.price_at_request)} (${active.payment_status_at_request ?? "—"})`} />
                  <Fact label="Requested" value={dt(active.created_at)} />
                  <Fact label="Last actioned" value={dt(active.handled_at)} />
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Customer</div>
                  <div className="mt-2 text-sm font-medium">{active.customer_name ?? "—"}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    {active.email && (
                      <a className="inline-flex items-center gap-1.5 underline" href={`mailto:${active.email}`}>
                        <Mail className="size-3.5" />{active.email}
                      </a>
                    )}
                    {(active.callback_phone || active.phone) && (
                      <a className="inline-flex items-center gap-1.5 underline" href={`tel:${active.callback_phone || active.phone}`}>
                        <Phone className="size-3.5" />{active.callback_phone || active.phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Reason given</div>
                  <div className="mt-1 text-sm font-medium">{active.reason}</div>
                  {active.details && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{active.details}</p>}
                </div>

                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Action this request</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs" htmlFor="refund-amount">Refund amount (£)</Label>
                      <Input
                        id="refund-amount"
                        className="mt-1"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={String(active.price_at_request ?? "0.00")}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor="admin-notes">Internal notes</Label>
                    <Textarea id="admin-notes" className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was agreed, refund reference, who approved it…" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={alsoCancel} onChange={(e) => setAlsoCancel(e.target.checked)} />
                    Also mark the booking itself as cancelled
                  </label>
                  <Button onClick={save} disabled={upd.isPending} className="w-full">
                    {upd.isPending ? "Saving…" : "Save decision"}
                  </Button>
                </div>

                {active.booking_id && (
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Reply to customer</div>
                    <CannedEmailComposer
                      scope="booking"
                      targetId={active.booking_id}
                      vars={{
                        name: active.customer_name,
                        ref: active.booking_ref,
                        pickup: active.pickup_address,
                        dropoff: active.dropoff_address,
                        date: active.pickup_date,
                        time: active.pickup_time,
                        reason: active.reason,
                      }}
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
  const { data = [] } = useQuery(cancelledBookingOpts);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data as any[])
      .filter((b) => !b.deleted_at && ["cancelled", "rejected"].includes(b.status))
      .filter((b) => !term || [b.booking_ref, b.customer_name, b.email, b.phone, b.pickup_address, b.dropoff_address]
        .some((f) => String(f ?? "").toLowerCase().includes(term)));
  }, [data, q]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cancelled bookings</h2>
          <p className="text-sm text-muted-foreground">
            Every booking that has been cancelled or rejected, whether the customer asked or your team did it.
          </p>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, name, address…" className="pl-9" />
        </div>
      </div>

      {rows.length === 0 ? (
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
                      {b.pickup_date ?? "—"} {b.pickup_time ?? ""} · {b.status === "rejected" ? "Rejected" : "Cancelled"}
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
                  <td className="px-4 py-3 text-xs">{b.payment_status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
