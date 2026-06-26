import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehiclesAdmin, upsertVehicle, deleteVehicle } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { supabase } from "@/integrations/supabase/client";

const opts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
export const Route = createFileRoute("/_authenticated/admin/fleet")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: FleetPage,
});

const CLASSES = [
  { v: "economy", l: "Economy Class" }, { v: "business", l: "Business Class" },
  { v: "first", l: "First Class" }, { v: "executive_v", l: "Executive V Class" },
  { v: "executive_van_8", l: "Executive Van 8 Seater" }, { v: "green", l: "Green Class" },
];

const empty = {
  id: undefined as string | undefined, name: "", category: "Executive", tbms_id: "", vehicle_class: "business",
  image_url: "", description: "", passengers: 4, luggage: 2, hand_luggage: 2,
  base_fare: null as number | null, per_mile_rate: null as number | null, waiting_charge: null as number | null,
  meet_greet_enabled: false, price_per_hour: null as number | null,
  display_order: 0, featured: false, active: true,
};

function FleetPage() {
  const { data: vehicles } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertVehicle);
  const del = useServerFn(deleteVehicle);
  const [form, setForm] = useState<any>(null);

  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicles"] }); toast.success("Vehicle saved"); setForm(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicles"] }); toast.success("Vehicle deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Vehicles & Mileage" description="Manage your fleet, vehicle classes, and pricing rules.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add vehicle</Button>
      </PageHeader>

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" hint="Add your first vehicle to start accepting bookings." action={<Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add vehicle</Button>} />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Image</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">TBMS</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Seats</th>
                <th className="text-left px-4 py-3">Luggage</th>
                <th className="text-left px-4 py-3">Base</th>
                <th className="text-left px-4 py-3">Per mile</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map((v: any, i: number) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3"><img src={v.image_url} alt="" className="size-12 object-cover rounded" /></td>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{v.tbms_id ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{v.vehicle_class?.replace(/_/g, " ") ?? v.category}</td>
                  <td className="px-4 py-3">{v.passengers}</td>
                  <td className="px-4 py-3">{v.luggage}+{v.hand_luggage}</td>
                  <td className="px-4 py-3">{v.base_fare != null ? `£${v.base_fare}` : "—"}</td>
                  <td className="px-4 py-3">{v.per_mile_rate != null ? `£${v.per_mile_rate}` : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...v })}><Edit className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="size-4 text-red-600" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete vehicle?</AlertDialogTitle><AlertDialogDescription>{v.name} will be removed permanently.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(v.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit vehicle" : "Add new vehicle"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Vehicle name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="TBMS ID"><Input value={form.tbms_id ?? ""} onChange={e => setForm({ ...form, tbms_id: e.target.value })} /></Field>
              <Field label="Vehicle class">
                <Select value={form.vehicle_class ?? "business"} onValueChange={v => setForm({ ...form, vehicle_class: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSES.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Category (legacy)"><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></Field>
              <Field label="Image URL *" full><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />{form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 object-cover rounded" />}</Field>
              <Field label="Description (use • for bullets)" full><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
              <Field label="Passengers"><Input type="number" value={form.passengers} onChange={e => setForm({ ...form, passengers: Number(e.target.value) })} /></Field>
              <Field label="Luggage"><Input type="number" value={form.luggage} onChange={e => setForm({ ...form, luggage: Number(e.target.value) })} /></Field>
              <Field label="Hand luggage"><Input type="number" value={form.hand_luggage} onChange={e => setForm({ ...form, hand_luggage: Number(e.target.value) })} /></Field>
              <Field label="Base fare (£)"><Input type="number" step="0.01" value={form.base_fare ?? ""} onChange={e => setForm({ ...form, base_fare: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Per mile (£)"><Input type="number" step="0.01" value={form.per_mile_rate ?? ""} onChange={e => setForm({ ...form, per_mile_rate: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Waiting charge (£/hr)"><Input type="number" step="0.01" value={form.waiting_charge ?? ""} onChange={e => setForm({ ...form, waiting_charge: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Price per hour (£)"><Input type="number" step="0.01" value={form.price_per_hour ?? ""} onChange={e => setForm({ ...form, price_per_hour: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Display order"><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.meet_greet_enabled} onCheckedChange={v => setForm({ ...form, meet_greet_enabled: v })} /><Label>Meet & Greet</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.featured} onCheckedChange={v => setForm({ ...form, featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><Label className="mb-1.5 block">{label}</Label>{children}</div>;
}
