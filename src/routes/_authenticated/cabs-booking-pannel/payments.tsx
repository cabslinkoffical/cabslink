import { formatTime12 } from "@/lib/time-format";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPayments, upsertPayment, deletePayment, listBookings } from "@/lib/admin.functions";
import { useState, useMemo, Fragment } from "react";
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
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "payments"], queryFn: () => listPayments() });
const bOpts = queryOptions({ queryKey: ["admin", "bookings"], queryFn: () => listBookings() });
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: payments." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, booking_id: null as string | null, amount: 0, currency: "GBP", method: "card", status: "unpaid", reference: "", notes: "" };

function Page() {
  const { data: payments } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPayment);
  const del = useServerFn(deletePayment);
  const [form, setForm] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState("all");
  const { data: bookings = [] } = useQuery(bOpts);

  const filtered = useMemo(() => {
    if (tab === "all") return payments;
    return payments.filter((p: any) => p.status === tab);
  }, [payments, tab]);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "payments"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "payments"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

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

      {filtered.length === 0 ? <EmptyState title="No payments" /> : (
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button aria-label="Delete" size="icon" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete payment?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(p.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <div><Label>Booking</Label>
                <Select value={form.booking_id ?? "none"} onValueChange={v => setForm({ ...form, booking_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No booking</SelectItem>{bookings.slice(0, 100).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.booking_ref} · {b.customer_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
                <div><Label>Method</Label><Input value={form.method ?? ""} onChange={e => setForm({ ...form, method: e.target.value })} placeholder="card / cash / bank" /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["unpaid", "paid", "partial", "refunded", "failed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference</Label><Input value={form.reference ?? ""} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
