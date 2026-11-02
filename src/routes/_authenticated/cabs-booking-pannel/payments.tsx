import { formatTime12 } from "@/lib/time-format";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { listPaymentsPage } from "@/lib/admin-lists.functions";
import { Pager, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { useServerFn } from "@tanstack/react-start";
import { upsertPayment, deletePayment } from "@/lib/admin.functions";
import { listBookingsPage } from "@/lib/admin-bookings.functions";
import { useDebounced } from "@/components/admin/Pager";
import { useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState, ListError } from "@/components/admin/ui";

const payOpts = (status: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "payments", { status, page, pageSize }],
  queryFn: () => listPaymentsPage({ data: { status, page, pageSize } }),
  placeholderData: keepPreviousData,
});
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: payments." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(payOpts("all", 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, booking_id: null as string | null, amount: 0, currency: "GBP", method: "card", status: "unpaid", reference: "", notes: "" };

function Page() {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPayment);
  const del = useServerFn(deletePayment);
  const [form, setForm] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState("all");
  const paging = usePageState(tab);
  const listQ = useQuery(payOpts(tab, paging.page, paging.pageSize));
  const filtered = (listQ.data?.rows ?? []) as any[];

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "payments"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "payments"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-6">
      <PageHeader title="Payments & Invoices" description="Track payments collected against bookings.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Record payment</Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {["all", "unpaid", "paid", "partial", "refunded", "failed"].map(t => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {listQ.isError ? <ListError error={listQ.error} onRetry={() => listQ.refetch()} /> : filtered.length === 0 ? <EmptyState title="No payments" /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Booking</th><th className="text-left px-4 py-3">Paid by</th><th className="text-right px-4 py-3">Amount</th><th className="text-left px-4 py-3">Card</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Paid</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{p.booking?.booking_ref ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.payer_name ?? p.booking?.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.payer_email ?? p.booking?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{p.currency} {Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{p.card_brand ? `${p.card_brand} •••• ${p.card_last4 ?? ""}` : (p.method ?? "—")}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.paid_at ?? p.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button aria-label="Details" size="icon" variant="ghost" onClick={() => setDetail(p)}><Eye className="size-4" /></Button>
                      <Button aria-label="Edit" size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...p })}><Edit className="size-4" /></Button>
                      {!p.payment_intent_id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button aria-label="Delete" size="icon" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this staff-recorded payment?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(p.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(listQ.data?.total ?? 0) > 0 && (
        <Pager page={paging.page} pageSize={paging.pageSize} total={listQ.data?.total ?? 0} noun="payments" loading={listQ.isFetching}
          onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} />
      )}

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment details</DialogTitle></DialogHeader>
          {detail && (
            <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm">
              {([
                ["Booking", detail.booking?.booking_ref],
                ["Paid by", detail.payer_name ?? detail.booking?.customer_name],
                ["Payer email", detail.payer_email ?? detail.booking?.email],
                ["Phone", detail.booking?.phone],
                ["Amount", `${detail.currency} ${Number(detail.amount).toFixed(2)}`],
                ["Card", detail.card_brand ? `${detail.card_brand} •••• ${detail.card_last4 ?? ""}` : detail.method],
                ["Payment status", detail.status],
                ["Processor status", detail.processor_status],
                ["Paid at", detail.paid_at ? new Date(detail.paid_at).toLocaleString() : null],
                ["Mode", detail.environment === "sandbox" ? "Test" : detail.environment === "live" ? "Live" : null],
                ["Checkout session", detail.reference],
                ["Payment ID", detail.payment_intent_id],
                ["Journey", detail.booking ? `${detail.booking.pickup_address ?? ""} → ${detail.booking.dropoff_address ?? ""}` : null],
                ["Pickup", detail.booking?.pickup_date ? `${detail.booking.pickup_date} ${formatTime12(detail.booking.pickup_time)}` : null],
                ["Booking status", detail.booking?.status],
                ["Notes", detail.notes],
              ] as [string, any][]).map(([k, v]) => (
                <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-all">{v || "—"}</dd></Fragment>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit payment" : "Record new payment"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              {form.payment_intent_id && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  This card payment was taken online. Only its reference and notes can be changed; give money back from Refunds.
                </p>
              )}
              <div><Label>Booking</Label>
                <BookingPicker
                  value={form.booking_id ?? null}
                  current={form.booking ?? null}
                  disabled={!!form.payment_intent_id}
                  onChange={(id, b) => setForm({ ...form, booking_id: id, booking: b })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (£) *</Label><Input type="number" min={0} step="0.01" disabled={!!form.payment_intent_id} value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div><Label>Currency</Label><Input value="GBP" readOnly disabled /></div>
                <div><Label>Method</Label><Input disabled={!!form.payment_intent_id} value={form.method ?? ""} onChange={e => setForm({ ...form, method: e.target.value })} placeholder="card / cash / bank" /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} disabled={!!form.payment_intent_id} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["unpaid", "paid", "partial", "refunded", "failed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s === "refunded" ? "refunded (in full)" : s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference</Label><Input value={form.reference ?? ""} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => {
                if (!(Number(form.amount) >= 0) || !Number.isFinite(Number(form.amount))) { toast.error("Enter a valid amount"); return; }
                save.mutate({ id: form.id, booking_id: form.booking_id ?? null, amount: Number(form.amount), currency: "GBP", method: form.method || null, status: form.status, reference: form.reference || null, notes: form.notes || null });
              }} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Searches every booking (newest first) instead of listing a capped subset. */
function BookingPicker({ value, current, disabled, onChange }: {
  value: string | null;
  current: { id?: string; booking_ref?: string; customer_name?: string } | null;
  disabled?: boolean;
  onChange: (id: string | null, booking: any) => void;
}) {
  const [term, setTerm] = useState("");
  const q = useDebounced(term.trim());
  const search = useServerFn(listBookingsPage);
  const res = useQuery({
    queryKey: ["admin", "bookings", "payment-picker", q],
    queryFn: () => search({ data: { tab: "all", q, page: 1, pageSize: 20, includeTours: true } }),
    enabled: !disabled,
    placeholderData: keepPreviousData,
  });
  const rows: any[] = res.data?.rows ?? [];
  const options = value && current && !rows.some((b) => b.id === value) ? [{ id: value, ...current }, ...rows] : rows;
  return (
    <div className="space-y-2">
      {!disabled && <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search reference, name, email or phone" aria-label="Search bookings" />}
      <Select value={value ?? "none"} disabled={disabled} onValueChange={(v) => onChange(v === "none" ? null : v, options.find((b) => b.id === v) ?? null)}>
        <SelectTrigger><SelectValue placeholder="Choose a booking" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No booking</SelectItem>
          {options.map((b) => <SelectItem key={b.id} value={b.id}>{b.booking_ref} · {b.customer_name}</SelectItem>)}
        </SelectContent>
      </Select>
      {!disabled && res.isError && <p className="text-xs text-destructive">Bookings couldn't be searched. Try again.</p>}
      {!disabled && !res.isError && (res.data?.total ?? 0) > rows.length && <p className="text-xs text-muted-foreground">Showing the newest {rows.length} of {res.data?.total} matches — search to narrow down.</p>}
    </div>
  );
}
