import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSurcharges, upsertSurcharge, deleteSurcharge, listVehiclesAdmin } from "@/lib/admin.functions";
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

const opts = queryOptions({ queryKey: ["admin", "surcharges"], queryFn: () => listSurcharges() });
const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });

export const Route = createFileRoute("/_authenticated/admin/surcharges")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(opts), context.queryClient.ensureQueryData(vOpts)]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, name: "", charge_type: "fixed", amount: 0, applies_to: "all", vehicle_id: null as string | null, starts_at: "", ends_at: "", time_from: "", time_to: "", days_of_week: [] as number[], notes: "", active: true };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: vehicles } = useSuspenseQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSurcharge);
  const del = useServerFn(deleteSurcharge);
  const [form, setForm] = useState<any>(null);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "surcharges"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "surcharges"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  function toggleDay(d: number) {
    const cur: number[] = form.days_of_week ?? [];
    setForm({ ...form, days_of_week: cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort() });
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Surcharges" description="Extra fees applied at quote time — late night, holidays, specific vehicles.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New surcharge</Button>
      </PageHeader>

      {data.length === 0 ? <EmptyState title="No surcharges" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((s: any) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5">{s.applies_to.replace("_", " ")}</div>
                </div>
                <StatusBadge status={s.active ? "active" : "inactive"} />
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">
                {s.charge_type === "fixed" ? `£${Number(s.amount).toFixed(2)}` : `${s.amount}%`}
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                {s.vehicle?.name && <div>Vehicle: {s.vehicle.name}</div>}
                {s.starts_at && <div>{new Date(s.starts_at).toLocaleDateString()} → {s.ends_at ? new Date(s.ends_at).toLocaleDateString() : "—"}</div>}
                {s.time_from && <div>{s.time_from} – {s.time_to}</div>}
                {s.days_of_week?.length > 0 && <div>{s.days_of_week.map((d: number) => DAYS[d]).join(", ")}</div>}
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...empty, ...s, starts_at: s.starts_at ? s.starts_at.slice(0, 16) : "", ends_at: s.ends_at ? s.ends_at.slice(0, 16) : "", time_from: s.time_from ?? "", time_to: s.time_to ?? "", days_of_week: s.days_of_week ?? [], notes: s.notes ?? "" })}><Edit className="size-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete surcharge?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(s.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{form?.id ? "Edit surcharge" : "New surcharge"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.charge_type} onValueChange={v => setForm({ ...form, charge_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="percent">Percent</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Amount *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Applies to</Label>
                <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All bookings</SelectItem>
                    <SelectItem value="vehicle">Specific vehicle</SelectItem>
                    <SelectItem value="time_window">Time window (days/hours)</SelectItem>
                    <SelectItem value="date_range">Date range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.applies_to === "vehicle" && (
                <div className="col-span-2"><Label>Vehicle</Label>
                  <Select value={form.vehicle_id ?? ""} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.applies_to === "date_range" && (<>
                <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} /></div>
              </>)}
              {form.applies_to === "time_window" && (<>
                <div><Label>From time</Label><Input type="time" value={form.time_from} onChange={e => setForm({ ...form, time_from: e.target.value })} /></div>
                <div><Label>To time</Label><Input type="time" value={form.time_to} onChange={e => setForm({ ...form, time_to: e.target.value })} /></div>
                <div className="col-span-2">
                  <Label>Days</Label>
                  <div className="flex gap-1 mt-1">
                    {DAYS.map((d, i) => (
                      <button key={d} type="button" onClick={() => toggleDay(i)} className={`px-2.5 py-1 rounded-md text-xs border ${(form.days_of_week ?? []).includes(i) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{d}</button>
                    ))}
                  </div>
                </div>
              </>)}
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
