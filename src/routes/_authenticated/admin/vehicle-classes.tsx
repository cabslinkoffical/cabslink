import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, Loader2 } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { listVehicleClassesAdmin, upsertVehicleClass, deleteVehicleClass, upsertVehicleModel, deleteVehicleModel } from "@/lib/vehicle-classes.functions";
import { listVehiclesAdmin } from "@/lib/admin.functions";

const opts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });

export const Route = createFileRoute("/_authenticated/admin/vehicle-classes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: VehicleClassesPage,
});

const FUEL_TYPES = [
  { v: "petrol_diesel", l: "Petrol / Diesel" },
  { v: "petrol_hybrid", l: "Petrol / Hybrid" },
  { v: "diesel", l: "Diesel" },
  { v: "electric", l: "Electric" },
  { v: "hydrogen", l: "Hydrogen" },
];
const REC_KEYS: [string, string][] = [
  ["airport", "Airport transfers"], ["corporate", "Corporate"],
  ["long_distance", "Long distance"], ["tours", "Tours"],
  ["weddings", "Weddings"], ["executive", "Executive"],
];

const emptyClass: any = {
  id: undefined, name: "", slug: "", hero_image: "", short_description: "", long_description: "",
  passengers: 3, large_luggage: 2, cabin_bags: 2, hand_luggage: 0,
  child_seats_supported: true, wheelchair_accessible: false, fuel_type: "petrol_diesel",
  recommended_for: {}, featured: false, badge: "", display_order: 0, active: true, quote_on_request: false,
  pricing_vehicle_id: null, seo_title: "", seo_description: "", seo_keywords: "",
};

function VehicleClassesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertVehicleClass);
  const deleteFn = useServerFn(deleteVehicleClass);
  const upsertModelFn = useServerFn(upsertVehicleModel);
  const deleteModelFn = useServerFn(deleteVehicleModel);
  const vehiclesQ = useQuery({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
  const vehicles: any[] = vehiclesQ.data ?? [];

  const [form, setForm] = useState<any>(null);
  const [modelForm, setModelForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const upsertMut = useMutation({
    mutationFn: (payload: any) => upsertFn({ data: payload }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] }); qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }); toast.success("Class saved"); setForm(null); setSaving(false); },
    onError: (e: any) => { toast.error(e.message ?? "Save failed"); setSaving(false); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] }); qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }); toast.success("Class deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
  const upsertModelMut = useMutation({
    mutationFn: (payload: any) => upsertModelFn({ data: payload }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] }); qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }); toast.success("Model saved"); setModelForm(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
  const delModelMut = useMutation({
    mutationFn: (id: string) => deleteModelFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] }); qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }); toast.success("Model deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const classes = data.classes;
  const modelsByClass = new Map<string, any[]>();
  for (const m of data.models) {
    const arr = modelsByClass.get(m.vehicle_class_id) ?? [];
    arr.push(m);
    modelsByClass.set(m.vehicle_class_id, arr);
  }

  const openNew = () => setForm({ ...emptyClass });
  const openEdit = (c: any) => setForm({ ...emptyClass, ...c, recommended_for: c.recommended_for ?? {} });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Vehicle Classes"
        description="Customers book a class, not a specific model. Pricing follows the linked representative vehicle."
      >
        <Button onClick={openNew}><Plus className="size-4 mr-1.5" />New class</Button>
      </PageHeader>

      {classes.length === 0 ? (
        <EmptyState title="No vehicle classes yet" hint="Create your first vehicle class to get started." />
      ) : (
        <div className="grid gap-4">
          {classes.map((c: any) => {
            const models = modelsByClass.get(c.id) ?? [];
            const linked = vehicles.find((v) => v.id === c.pricing_vehicle_id);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col md:flex-row gap-5">
                <div className="w-full md:w-40 aspect-[4/3] rounded-xl bg-[var(--surface)] flex items-center justify-center overflow-hidden shrink-0">
                  {c.hero_image ? (
                    <img src={c.hero_image} alt={c.name} className="w-full h-full object-cover" />
                  ) : linked?.image_url ? (
                    <img src={linked.image_url} alt={c.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-semibold">{c.name}</h3>
                    <StatusBadge status={c.active ? "active" : "inactive"} />
                    {c.featured && <StatusBadge status="featured" color="bg-[var(--gold)]/15 text-[var(--gold-foreground,#000)]" />}
                    {c.quote_on_request && <StatusBadge status="quote on request" />}
                    <span className="text-[11px] text-muted-foreground">/{c.slug}</span>
                  </div>
                  {c.short_description && <p className="mt-1 text-sm text-muted-foreground">{c.short_description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Passengers: <b className="text-foreground">{c.passengers}</b></span>
                    <span>Large luggage: <b className="text-foreground">{c.large_luggage}</b></span>
                    <span>Cabin bags: <b className="text-foreground">{c.cabin_bags}</b></span>
                    <span>Fuel: <b className="text-foreground capitalize">{(c.fuel_type ?? "").replace(/_/g, " ")}</b></span>
                    <span>Models: <b className="text-foreground">{models.length}</b></span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Models:</span>
                    {models.map((m) => (
                      <span key={m.id} className="group inline-flex items-center gap-1 rounded-full bg-[var(--navy)]/5 text-[var(--navy)]/80 px-2 py-0.5 text-[11px]">
                        {m.name}
                        <button className="opacity-40 hover:opacity-100" onClick={() => delModelMut.mutate(m.id)}><X className="size-3" /></button>
                      </span>
                    ))}
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setModelForm({ vehicle_class_id: c.id, name: "", manufacturer: "", active: true, display_order: 0 })}>
                      <Plus className="size-3 mr-1" />Add model
                    </Button>
                  </div>
                </div>
                <div className="flex flex-row md:flex-col gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit className="size-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="size-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription>All models under this class will also be removed. Bookings referencing this class will keep their name snapshot.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => delMut.mutate(c.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit vehicle class" : "New vehicle class"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} /></div>
                <div className="sm:col-span-2"><Label>Hero image URL</Label><Input value={form.hero_image ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, hero_image: e.target.value }))} placeholder="https://..." /></div>
                <div className="sm:col-span-2"><Label>Short description</Label><Input value={form.short_description ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, short_description: e.target.value }))} /></div>
                <div className="sm:col-span-2"><Label>Long description</Label><Textarea rows={3} value={form.long_description ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, long_description: e.target.value }))} /></div>
                <div><Label>Passengers</Label><Input type="number" value={form.passengers} onChange={(e) => setForm((f: any) => ({ ...f, passengers: Number(e.target.value) }))} /></div>
                <div><Label>Large luggage</Label><Input type="number" value={form.large_luggage} onChange={(e) => setForm((f: any) => ({ ...f, large_luggage: Number(e.target.value) }))} /></div>
                <div><Label>Cabin bags</Label><Input type="number" value={form.cabin_bags} onChange={(e) => setForm((f: any) => ({ ...f, cabin_bags: Number(e.target.value) }))} /></div>
                <div><Label>Hand luggage</Label><Input type="number" value={form.hand_luggage} onChange={(e) => setForm((f: any) => ({ ...f, hand_luggage: Number(e.target.value) }))} /></div>
                <div>
                  <Label>Fuel type</Label>
                  <Select value={form.fuel_type} onValueChange={(v) => setForm((f: any) => ({ ...f, fuel_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FUEL_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Badge</Label><Input value={form.badge ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, badge: e.target.value }))} placeholder="e.g. Most popular" /></div>

                <div><Label>Display order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm((f: any) => ({ ...f, display_order: Number(e.target.value) }))} /></div>
                <div className="sm:col-span-2"><Label>SEO title</Label><Input value={form.seo_title ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, seo_title: e.target.value }))} /></div>
                <div className="sm:col-span-2"><Label>SEO description</Label><Textarea rows={2} value={form.seo_description ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, seo_description: e.target.value }))} /></div>
              </div>

              <div>
                <Label className="mb-2 block">Recommended for</Label>
                <div className="grid grid-cols-2 gap-2">
                  {REC_KEYS.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <Switch checked={!!form.recommended_for?.[k]} onCheckedChange={(v) => setForm((f: any) => ({ ...f, recommended_for: { ...(f.recommended_for ?? {}), [k]: v } }))} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.child_seats_supported} onCheckedChange={(v) => setForm((f: any) => ({ ...f, child_seats_supported: v }))} />Child seats supported</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.wheelchair_accessible} onCheckedChange={(v) => setForm((f: any) => ({ ...f, wheelchair_accessible: v }))} />Wheelchair accessible</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.featured} onCheckedChange={(v) => setForm((f: any) => ({ ...f, featured: v }))} />Featured</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.quote_on_request} onCheckedChange={(v) => setForm((f: any) => ({ ...f, quote_on_request: v }))} />Quote on request</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.active} onCheckedChange={(v) => setForm((f: any) => ({ ...f, active: v }))} />Active</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button disabled={saving} onClick={() => {
                  setSaving(true);
                  const payload = { ...form };
                  if (!payload.hero_image) payload.hero_image = null;
                  upsertMut.mutate(payload);
                }}>{saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!modelForm} onOpenChange={(o) => !o && setModelForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add vehicle model</DialogTitle></DialogHeader>
          {modelForm && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={modelForm.name} onChange={(e) => setModelForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Manufacturer</Label><Input value={modelForm.manufacturer ?? ""} onChange={(e) => setModelForm((f: any) => ({ ...f, manufacturer: e.target.value }))} /></div>
              <div><Label>Display order</Label><Input type="number" value={modelForm.display_order} onChange={(e) => setModelForm((f: any) => ({ ...f, display_order: Number(e.target.value) }))} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!modelForm.active} onCheckedChange={(v) => setModelForm((f: any) => ({ ...f, active: v }))} />Active</label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setModelForm(null)}>Cancel</Button>
                <Button onClick={() => upsertModelMut.mutate(modelForm)}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
