import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDrivers, upsertDriver, deleteDriver, listVehiclesAdmin } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { PhoneInput } from "@/components/site/PhoneInput";

const opts = queryOptions({ queryKey: ["admin", "drivers"], queryFn: () => listDrivers() });
const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
export const Route = createFileRoute("/_authenticated/admin/drivers")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, full_name: "", email: "", phone: "", address: "", license_number: "", assigned_vehicle_id: null as string | null, status: "active", available: true, photo_url: "", notes: "" };

function Page() {
  const { data: drivers } = useSuspenseQuery(opts);
  const { data: vehicles = [] } = useQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertDriver);
  const del = useServerFn(deleteDriver);
  const [form, setForm] = useState<any>(null);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "drivers"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "drivers"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Drivers" description="Manage your driver roster, availability, and vehicle assignments.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add driver</Button>
      </PageHeader>

      {drivers.length === 0 ? <EmptyState title="No drivers yet" action={<Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add driver</Button>} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d: any) => (
            <div key={d.id} className="border border-border rounded-xl bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar className="size-12"><AvatarImage src={d.photo_url ?? undefined} /><AvatarFallback className="bg-primary text-primary-foreground">{d.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{d.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="size-3" /> {d.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="size-3" /> {d.phone ?? "—"}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3"><StatusBadge status={d.status} />{d.available ? <StatusBadge status="active" color="bg-success/12 text-success" /> : null}</div>
              <div className="text-xs text-muted-foreground mt-2">Vehicle: <span className="text-foreground">{d.vehicle?.name ?? "—"}</span></div>
              <div className="text-xs text-muted-foreground">License: <span className="text-foreground font-mono">{d.license_number ?? "—"}</span></div>
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...empty, ...d })}><Edit className="size-3.5 mr-1" /> Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="size-3.5 mr-1" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete driver?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(d.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit driver" : "Add driver"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><PhoneInput value={form.phone ?? ""} onChange={v => setForm({ ...form, phone: v })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>License number</Label><Input value={form.license_number ?? ""} onChange={e => setForm({ ...form, license_number: e.target.value })} /></div>
              <div>
                <Label>Assigned vehicle</Label>
                <Select value={form.assigned_vehicle_id ?? "none"} onValueChange={v => setForm({ ...form, assigned_vehicle_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active", "inactive", "suspended"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.available} onCheckedChange={v => setForm({ ...form, available: v })} /><Label>Available</Label></div>
              <div className="sm:col-span-2"><Label>Photo URL</Label><Input value={form.photo_url ?? ""} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://…" /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
