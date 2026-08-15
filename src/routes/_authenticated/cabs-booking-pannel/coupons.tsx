import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCoupons, upsertCoupon, deleteCoupon } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { BulkTools } from "@/components/admin/BulkTools";

const opts = queryOptions({ queryKey: ["admin", "coupons"], queryFn: () => listCoupons() });
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: coupons." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, code: "", discount_type: "percentage", discount_value: 10, min_booking_amount: 0, usage_limit: null as number | null, starts_at: "", expires_at: "", active: true, notes: "" };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCoupon);
  const del = useServerFn(deleteCoupon);
  const [form, setForm] = useState<any>(null);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "coupons"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "coupons"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Coupons & Discounts" description="Create promo codes with limits and validity windows.">
        <BulkTools entity="coupons" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "coupons"] })} />
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New coupon</Button>
      </PageHeader>

      {data.length === 0 ? <EmptyState title="No coupons" /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Value</th><th className="text-left px-4 py-3">Min order</th><th className="text-left px-4 py-3">Usage</th><th className="text-left px-4 py-3">Validity</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{c.code}</td>
                  <td className="px-4 py-3 capitalize">{c.discount_type}</td>
                  <td className="px-4 py-3">{c.discount_type === "percentage" ? `${c.discount_value}%` : `£${c.discount_value}`}</td>
                  <td className="px-4 py-3">£{c.min_booking_amount}</td>
                  <td className="px-4 py-3 text-xs">{c.used_count}/{c.usage_limit ?? "∞"}</td>
                  <td className="px-4 py-3 text-xs">{c.starts_at ?? "—"} → {c.expires_at ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button aria-label="Edit" size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...c, starts_at: c.starts_at ?? "", expires_at: c.expires_at ?? "" })}><Edit className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button aria-label="Delete" size="icon" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete coupon?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono" /></div>
              <div><Label>Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed amount</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Value *</Label><Input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
              <div><Label>Min booking amount</Label><Input type="number" step="0.01" value={form.min_booking_amount} onChange={e => setForm({ ...form, min_booking_amount: Number(e.target.value) })} /></div>
              <div><Label>Usage limit</Label><Input type="number" value={form.usage_limit ?? ""} onChange={e => setForm({ ...form, usage_limit: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Starts</Label><Input type="date" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate({ ...form, starts_at: form.starts_at || null, expires_at: form.expires_at || null })} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
