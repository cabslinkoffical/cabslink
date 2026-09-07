import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  listBookingAmendments,
  updateBookingAmendment,
  deleteBookingAmendment,
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
  Search, Eye, Trash2, Phone, Mail, PencilLine, Clock,
  BadgePoundSterling, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({
  queryKey: ["admin", "amendments"],
  queryFn: () => listBookingAmendments(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/amendments")({
  head: () => ({
    meta: [
      { title: "Changes & Refunds — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: booking change requests, top-up payments and refunds." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: AmendmentsPage,
});

const STATUSES = ["pending_payment", "awaiting_refund", "applied", "declined"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  pending_payment: "Top-up due",
  awaiting_refund: "Refund due",
  applied: "Settled",
  declined: "Declined",
};

const STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-warning/15 text-warning border-warning/30",
  awaiting_refund: "bg-info/15 text-info border-info/30",
  applied: "bg-success/15 text-success border-success/30",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
};

const money = (v: unknown) => (v == null ? "—" : `£${Number(v).toFixed(2)}`);
const dt = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

const FIELD_LABELS: Record<string, string> = {
  pickupDate: "Pickup date",
  pickup_date: "Pickup date",
  pickupTime: "Pickup time",
  pickup_time: "Pickup time",
  passengers: "Passengers",
  luggage: "Suitcases",
  handLuggage: "Hand bags",
  hand_luggage: "Hand bags",
  flightNumber: "Flight number",
  flight_number: "Flight number",
  meetGreet: "Meet & greet",
  meet_greet: "Meet & greet",
  childSeatCount: "Child seats",
  child_seat_count: "Child seats",
  returnJourney: "Return journey",
  return_journey: "Return journey",
  notes: "Notes",
  price: "Fare",
};

const show = (v: unknown) => {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (v == null || v === "") return "—";
  return String(v);
};

function Pill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {STATUS_LABELS[status as Status] ?? status}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}

/** Rows where a stored value actually differs from what the customer asked for. */
function diffRows(previous: any, changes: any) {
  const prev = previous && typeof previous === "object" ? previous : {};
  const next = changes && typeof changes === "object" ? changes : {};
  const pairs: Array<[string, unknown, unknown]> = [];
  const seen = new Set<string>();
  const norm = (k: string) => k.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());

  for (const [k, v] of Object.entries(next)) {
    const camel = norm(k);
    if (seen.has(camel)) continue;
    seen.add(camel);
    const before =
      camel in prev ? (prev as any)[camel]
        : k in prev ? (prev as any)[k]
          : (prev as any)[camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
    if (String(before ?? "") === String(v ?? "")) continue;
    pairs.push([FIELD_LABELS[k] ?? FIELD_LABELS[camel] ?? camel, before, v]);
  }
  return pairs;
}

function AmendmentsPage() {
  const { data } = useSuspenseQuery(opts);
  const rowsAll = (data ?? []) as any[];
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "amendments"] });
    qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const upd = useMutation({
    mutationFn: useServerFn(updateBookingAmendment),
    onSuccess: () => { invalidate(); toast.success("Change request updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteBookingAmendment),
    onSuccess: () => { invalidate(); toast.success("Change request removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [tab, setTab] = useState<"open" | Status | "all">("open");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rowsAll.length, open: 0 };
    for (const r of rowsAll) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (r.status === "pending_payment" || r.status === "awaiting_refund") c.open += 1;
    }
    return c;
  }, [rowsAll]);

  const topUpDue = useMemo(
    () => rowsAll.filter((r) => r.status === "pending_payment").reduce((s, r) => s + Number(r.delta ?? 0), 0),
    [rowsAll],
  );
  const refundDue = useMemo(
    () => rowsAll
      .filter((r) => r.status === "awaiting_refund")
      .reduce((s, r) => s + Number(r.refund_amount ?? Math.abs(Number(r.delta ?? 0))), 0),
    [rowsAll],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rowsAll.filter((r) => {
      if (tab === "open" && !(r.status === "pending_payment" || r.status === "awaiting_refund")) return false;
      if (tab !== "open" && tab !== "all" && r.status !== tab) return false;
      if (!term) return true;
      return [r.booking_ref, r.customer_name, r.email, r.phone, r.customer_note]
        .some((f) => String(f ?? "").toLowerCase().includes(term));
    });
  }, [rowsAll, tab, q]);

  const [openId, setOpenId] = useState<string | null>(null);
  const active = rowsAll.find((r) => r.id === openId) ?? null;

  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("applied");

  useEffect(() => {
    if (!active) return;
    setNotes(active.admin_notes ?? "");
    setAmount(active.refund_amount == null ? "" : String(active.refund_amount));
    setStatus((active.status ?? "applied") as Status);
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!active) return;
    upd.mutate({
      data: {
        id: active.id,
        status,
        admin_notes: notes.trim() || null,
        refund_amount: amount.trim() === "" ? null : Number(amount),
      },
    } as any);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Changes & Refunds"
        description="Every booking change a customer makes lands here with the before and after, the fare difference, and whether money is owed either way."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Needs action" value={counts.open ?? 0} icon={Clock} />
        <MiniStat label="Top-up due" value={money(topUpDue)} icon={ArrowUpRight} />
        <MiniStat label="Refund due" value={money(refundDue)} icon={ArrowDownRight} />
        <MiniStat label="Settled" value={counts.applied ?? 0} icon={BadgePoundSterling} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="open">Needs action ({counts.open ?? 0})</TabsTrigger>
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
        <EmptyState title="No change requests here" hint="Changes customers make from the Manage Booking page appear in this list." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">What changed</th>
                <th className="px-4 py-3">Fare</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = Number(r.delta ?? 0);
                return (
                  <tr key={r.id} className="border-t border-border/70 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.booking_ref}</div>
                      <div className="text-xs text-muted-foreground">{r.payment_status_at_request ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.customer_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[18rem]">
                      <div className="truncate text-xs text-muted-foreground">
                        {r.customer_note
                          ? String(r.customer_note).split("\n").join(" · ")
                          : diffRows(r.previous, r.changes).map(([l]) => l).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{money(r.old_price)} → <span className="font-semibold">{money(r.new_price)}</span></div>
                      <div className={`text-xs font-medium ${delta > 0 ? "text-warning" : delta < 0 ? "text-info" : "text-muted-foreground"}`}>
                        {delta > 0 ? `+${money(delta)} to collect` : delta < 0 ? `${money(Math.abs(delta))} to refund` : "No change"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dt(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v) => upd.mutate({ data: { id: r.id, status: v } } as any)}>
                        <SelectTrigger className="h-8 w-[9.5rem] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label="Open change request" onClick={() => setOpenId(r.id)}>
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete change request"
                          onClick={() => { if (confirm(`Remove the change request for ${r.booking_ref}?`)) del.mutate({ data: { id: r.id } } as any); }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <PencilLine className="size-4" />
                  {active.booking_ref}
                  <Pill status={active.status} />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Before and after</div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr><th className="pb-1">Field</th><th className="pb-1">Was</th><th className="pb-1">Now</th></tr>
                      </thead>
                      <tbody>
                        {diffRows(active.previous, active.changes).map(([label, before, after]) => (
                          <tr key={label} className="border-t border-border/60">
                            <td className="py-1.5 pr-3 text-muted-foreground">{label}</td>
                            <td className="py-1.5 pr-3 line-through opacity-70">{show(before)}</td>
                            <td className="py-1.5 font-medium">{show(after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Fact label="Fare before" value={money(active.old_price)} />
                  <Fact label="Fare now" value={money(active.new_price)} />
                  <Fact label="Difference" value={money(active.delta)} />
                  <Fact label="Payment at request" value={active.payment_status_at_request ?? "—"} />
                  <Fact label="Requested" value={dt(active.created_at)} />
                  <Fact label="Top-up settled" value={dt(active.top_up_paid_at)} />
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
                    {active.phone && (
                      <a className="inline-flex items-center gap-1.5 underline" href={`tel:${active.phone}`}>
                        <Phone className="size-3.5" />{active.phone}
                      </a>
                    )}
                  </div>
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
                        placeholder={String(Math.abs(Number(active.delta ?? 0)).toFixed(2))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor="amend-notes">Internal notes</Label>
                    <Textarea
                      id="amend-notes"
                      className="mt-1"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Refund reference, who approved it, what the customer was told…"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={save} disabled={upd.isPending} className="flex-1">
                      {upd.isPending ? "Saving…" : "Save decision"}
                    </Button>
                    {active.status === "pending_payment" && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={upd.isPending}
                        onClick={() => upd.mutate({ data: { id: active.id, status: "applied", mark_paid: true } } as any)}
                      >
                        Mark top-up paid
                      </Button>
                    )}
                    {active.status === "awaiting_refund" && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={upd.isPending}
                        onClick={() => upd.mutate({ data: { id: active.id, status: "applied" } } as any)}
                      >
                        Mark refund paid
                      </Button>
                    )}
                  </div>
                </div>

                {active.booking_id && (
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Reply to customer</div>
                    <CannedEmailComposer
                      scope="booking"
                      targetId={active.booking_id}
                      vars={{ name: active.customer_name, ref: active.booking_ref }}
                      email={active.email ?? ""}
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
