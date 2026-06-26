import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPricingRules, upsertPricingRule, deletePricingRule, listVehiclesAdmin } from "@/lib/admin.functions";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "pricing"], queryFn: () => listPricingRules() });
const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(opts), context.queryClient.ensureQueryData(vOpts)]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, from_address: "", to_address: "", vehicle_id: null as string | null, price: 0, currency: "GBP", valid_from: "", valid_to: "", notes: "", active: true };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: vehicles } = useSuspenseQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPricingRule);
  const del = useServerFn(deletePricingRule);
  const [form, setForm] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [vFilter, setVFilter] = useState("all");

  const filtered = useMemo(() => data.filter((r: any) => {
    const s = search.toLowerCase();
    const matchS = !s || r.from_address.toLowerCase().includes(s) || r.to_address.toLowerCase().includes(s);
    const matchV = vFilter === "all" || r.vehicle_id === vFilter || (vFilter === "any" && !r.vehicle_id);
    return matchS && matchV;
  }), [data, search, vFilter]);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "pricing"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "pricing"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Fixed Pricing" description="Route-based fixed fares. Booking quotes match these first before per-mile rates.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New rule</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search address…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={vFilter} onValueChange={setVFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            <SelectItem value="any">Any vehicle (unscoped)</SelectItem>
            {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState title="No pricing rules" hint="Create your first fixed-price route." /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">From</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3">Vehicle</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Validity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{r.from_address}</td>
                  <td className="px-4 py-3">{r.to_address}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.vehicle?.name ?? "Any"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.currency} {Number(r.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.valid_from ?? "—"} → {r.valid_to ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...r, valid_from: r.valid_from ?? "", valid_to: r.valid_to ?? "", notes: r.notes ?? "" })}><Edit className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="size-4 text-red-600" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete pricing rule?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(r.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
          <DialogHeader><DialogTitle>{form?.id ? "Edit pricing rule" : "New pricing rule"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>From address *</Label><Input value={form.from_address} onChange={e => setForm({ ...form, from_address: e.target.value })} /></div>
              <div className="col-span-2"><Label>To address *</Label><Input value={form.to_address} onChange={e => setForm({ ...form, to_address: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Vehicle (optional)</Label>
                <Select value={form.vehicle_id ?? "__any"} onValueChange={v => setForm({ ...form, vehicle_id: v === "__any" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Any vehicle</SelectItem>
                    {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Price *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
              <div><Label>Valid from</Label><Input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} /></div>
              <div><Label>Valid to</Label><Input type="date" value={form.valid_to} onChange={e => setForm({ ...form, valid_to: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <div className="col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
