import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehiclesAdmin, upsertVehicle, deleteVehicle } from "@/lib/admin.functions";
import { adminListPricingProfiles } from "@/lib/pricing.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Upload, Loader2, X, ChevronDown, Users, Briefcase, Clock, MapPin, Gauge, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { supabase } from "@/integrations/supabase/client";
import { optimizeImage, getOptimizeSpeed, setOptimizeSpeed, type OptimizeSpeed } from "@/lib/optimize-image";

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

const emptyVehicle = {
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
  const listPricingFn = useServerFn(adminListPricingProfiles);

  const pricingQ = useQuery({ queryKey: ["pricing-profiles"], queryFn: () => listPricingFn() });
  const allProfiles: any[] = pricingQ.data?.profiles ?? [];

  const [form, setForm] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [optSpeed, setOptSpeedState] = useState<OptimizeSpeed>(() => getOptimizeSpeed());
  function updateOptSpeed(s: OptimizeSpeed) { setOptSpeedState(s); setOptimizeSpeed(s); }
  const [saving, setSaving] = useState(false);

  function openNew() { setForm({ ...emptyVehicle }); }
  function openEdit(v: any) { setForm({ ...emptyVehicle, ...v }); }
  function close() { setForm(null); }

  async function handleImageUpload(file: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vehicle-images").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data, error: urlErr } = await supabase.storage.from("vehicle-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (urlErr) throw urlErr;
      setForm((f: any) => ({ ...f, image_url: data.signedUrl }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setUploading(false); }
  }

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicles"] }); toast.success("Vehicle deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  async function save() {
    if (!form?.name?.trim()) { toast.error("Vehicle name is required"); return; }
    if (!form?.image_url) { toast.error("Vehicle image is required"); return; }
    setSaving(true);
    try {
      await upsert({ data: form });
      qc.invalidateQueries({ queryKey: ["admin", "vehicles"] });
      toast.success(form.id ? "Vehicle updated" : "Vehicle added");
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Vehicles" description="Manage your fleet details. Mileage pricing is set in Pricing → Mileage Pricing.">
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/admin/mileage-pricing"><Gauge className="size-4 mr-1" /> Mileage pricing</Link></Button>
          <Button onClick={openNew}><Plus className="size-4 mr-1" /> Add vehicle</Button>
        </div>
      </PageHeader>

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" hint="Add your first vehicle to start accepting bookings." action={<Button onClick={openNew}><Plus className="size-4 mr-1" /> Add vehicle</Button>} />
      ) : (
        <div className="grid gap-3">
          {vehicles.map((v: any) => (
            <VehicleCard
              key={v.id}
              v={v}
              profile={allProfiles.find((p) => p.vehicle_id === v.id)}
              onEdit={() => openEdit(v)}
              onDelete={() => remove.mutate(v.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit vehicle" : "Add new vehicle"}</DialogTitle>
          </DialogHeader>

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
              <Field label="Vehicle image *" full>
                {form.image_url ? (
                  <div className="relative inline-block">
                    <img src={form.image_url} alt="" className="h-32 object-cover rounded border border-border" />
                    <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 size-6 rounded-full" onClick={() => setForm({ ...form, image_url: "" })}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    {uploading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <Upload className="size-6 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload image (max 5MB)"}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
                  </label>
                )}
              </Field>
              <Field label="Description (use • for bullets)" full><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
              <Field label="Passengers"><Input type="number" value={form.passengers} onChange={e => setForm({ ...form, passengers: Number(e.target.value) })} /></Field>
              <Field label="Luggage"><Input type="number" value={form.luggage} onChange={e => setForm({ ...form, luggage: Number(e.target.value) })} /></Field>
              <Field label="Hand luggage"><Input type="number" value={form.hand_luggage} onChange={e => setForm({ ...form, hand_luggage: Number(e.target.value) })} /></Field>
              <Field label="Display order"><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.meet_greet_enabled} onCheckedChange={v => setForm({ ...form, meet_greet_enabled: v })} /><Label>Meet & Greet</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.featured} onCheckedChange={v => setForm({ ...form, featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <p className="sm:col-span-2 text-xs text-muted-foreground bg-muted/30 border border-border rounded-md px-3 py-2">
                Pricing is managed separately: <strong>Pricing → Routes</strong> for fixed fares, <strong>Pricing → Mileage Pricing</strong> for per-vehicle tiered rates.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-2">
            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Saving…</> : "Save vehicle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><Label className="mb-1.5 block">{label}</Label>{children}</div>;
}

function VehicleCard({ v, profile, onEdit, onDelete }: { v: any; profile: any; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const tiers = profile?.tiers ?? [];
  const hasTimeExtra = profile?.vehicle_add_price_enabled && profile?.time_extra_from && profile?.time_extra_to;
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <img src={v.image_url} alt={v.name} className="size-16 sm:size-20 object-cover rounded-lg bg-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{v.name}</h3>
            <StatusBadge status={v.active ? "active" : "inactive"} />
            {v.featured && <span className="text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">Featured</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 capitalize">
            {v.vehicle_class?.replace(/_/g, " ") ?? v.category}
            {v.tbms_id && <span className="font-mono ml-2">· TBMS {v.tbms_id}</span>}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
            <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {v.passengers}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="size-3.5" /> {v.luggage}+{v.hand_luggage}</span>
            {profile ? (
              <span className="inline-flex items-center gap-1 text-foreground/70">From £{Number(profile.base_price).toFixed(2)} · {tiers.length} {tiers.length === 1 ? "tier" : "tiers"}</span>
            ) : (
              <span className="text-amber-600">No mileage pricing</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setOpen(o => !o)} className="gap-1">
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
            <span className="hidden sm:inline">{open ? "Hide" : "Details"}</span>
          </Button>
          <Button size="icon" variant="ghost" onClick={onEdit}><Edit className="size-4" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="size-4 text-red-600" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete vehicle?</AlertDialogTitle><AlertDialogDescription>{v.name} will be removed permanently.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/20 p-4 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Gauge className="size-3.5" /> Mileage Pricing</div>
            {profile ? (
              <div className="rounded-lg border border-border bg-background overflow-hidden">
                <div className="flex justify-between px-3 py-2 text-xs bg-muted/40">
                  <span className="text-muted-foreground">Minimum price</span>
                  <span className="font-semibold">£{Number(profile.base_price).toFixed(2)}</span>
                </div>
                {tiers.length ? (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {tiers.map((t: any) => (
                        <tr key={t.id ?? t.sort_order}>
                          <td className="px-3 py-2 text-muted-foreground">{t.tier_name}</td>
                          <td className="px-3 py-2 text-right">{t.miles} mi</td>
                          <td className="px-3 py-2 text-right font-medium">£{Number(t.cost_per_mile).toFixed(2)}/mi</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-3 py-3 text-xs text-muted-foreground">No tiers configured.</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">No pricing profile yet.</div>
            )}
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link to="/admin/mileage-pricing">Manage mileage pricing</Link>
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Settings2 className="size-3.5" /> Extras</div>
              <div className="rounded-lg border border-border bg-background divide-y divide-border text-sm">
                <Row icon={<MapPin className="size-3.5" />} label="Via stop price" value={profile ? `£${Number(profile.via_price).toFixed(2)}/mi` : "—"} />
                <Row icon={<Clock className="size-3.5" />} label="Time surcharge" value={hasTimeExtra ? `${profile.time_extra_from}–${profile.time_extra_to} · ${profile.time_extra_type === "percent" ? `${profile.time_extra_amount}%` : `£${Number(profile.time_extra_amount).toFixed(2)}`}` : "Disabled"} />
                <Row label="Meet & Greet" value={v.meet_greet_enabled ? "Enabled" : "Disabled"} />
              </div>
            </div>
            {v.description && (
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Description</div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{v.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-muted-foreground inline-flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
