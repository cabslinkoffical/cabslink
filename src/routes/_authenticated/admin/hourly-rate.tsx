import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHourlyRates, upsertHourlyRate, deleteHourlyRate, listVehiclesAdmin } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "hourly"], queryFn: () => listHourlyRates() });
const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });

export const Route = createFileRoute("/_authenticated/admin/hourly-rate")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(opts), context.queryClient.ensureQueryData(vOpts)]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, vehicle_id: null as string | null, min_hours: 1, max_hours: 4, price_per_hour: 60, currency: "GBP", active: true };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: vehicles } = useSuspenseQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertHourlyRate);
  const del = useServerFn(deleteHourlyRate);
  const [form, setForm] = useState<any>(null);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "hourly"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "hourly"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Hourly Rates" description="Per-vehicle hourly tiers used by chauffeur-by-the-hour quotes.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New tier</Button>
      </PageHeader>

      {data.length === 0 ? <EmptyState title="No hourly tiers" hint="Add a tier per vehicle." /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Vehicle</th>
                <th className="text-left px-4 py-3">Hours range</th>
                <th className="text-right px-4 py-3">Rate / hour</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{r.vehicle?.name ?? "Any"}</td>
                  <td className="px-4 py-3">{r.min_hours}h – {r.max_hours}h</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.currency} {Number(r.price_per_hour).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...r })}><Edit className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="size-4 text-red-600" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete tier?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(r.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
          <DialogHeader><DialogTitle>{form?.id ? "Edit tier" : "New tier"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Vehicle</Label>
                <Select value={form.vehicle_id ?? "__any"} onValueChange={v => setForm({ ...form, vehicle_id: v === "__any" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Any vehicle</SelectItem>
                    {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Min hours *</Label><Input type="number" min={1} value={form.min_hours} onChange={e => setForm({ ...form, min_hours: Number(e.target.value) })} /></div>
              <div><Label>Max hours *</Label><Input type="number" min={1} value={form.max_hours} onChange={e => setForm({ ...form, max_hours: Number(e.target.value) })} /></div>
              <div><Label>Price per hour *</Label><Input type="number" step="0.01" value={form.price_per_hour} onChange={e => setForm({ ...form, price_per_hour: Number(e.target.value) })} /></div>
              <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <div className="col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
