import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehiclesAdmin, upsertVehicle, deleteVehicle } from "@/lib/admin.functions";
import { adminListPricingProfiles, adminSavePricingProfile } from "@/lib/pricing.functions";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Upload, Loader2, X, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Check, Car, Gauge, Settings2, ChevronDown, Users, Briefcase, Clock, MapPin } from "lucide-react";
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

type Tier = { tier_name: string; miles: number; cost_per_mile: number; sort_order: number };

const emptyVehicle = {
  id: undefined as string | undefined, name: "", category: "Executive", tbms_id: "", vehicle_class: "business",
  image_url: "", description: "", passengers: 4, luggage: 2, hand_luggage: 2,
  base_fare: null as number | null, per_mile_rate: null as number | null, waiting_charge: null as number | null,
  meet_greet_enabled: false, price_per_hour: null as number | null,
  display_order: 0, featured: false, active: true,
};

const emptyPricing = {
  id: null as string | null,
  base_price: 35,
  via_price: 10,
  vehicle_add_price_enabled: false,
  time_extra_from: "",
  time_extra_to: "",
  time_extra_amount: 0,
  time_extra_type: "fixed" as "fixed" | "percent",
  status: true,
  tiers: [
    { tier_name: "Next 10 miles", miles: 10, cost_per_mile: 0.01, sort_order: 1 },
    { tier_name: "Next 20 miles", miles: 20, cost_per_mile: 3.5, sort_order: 2 },
    { tier_name: "Next 40 miles", miles: 40, cost_per_mile: 2.2, sort_order: 3 },
  ] as Tier[],
};

const STEPS = [
  { key: "details", label: "Vehicle Details", icon: Car },
  { key: "mileage", label: "Mileage Pricing", icon: Gauge },
  { key: "extras", label: "Extras & Status", icon: Settings2 },
];

function FleetPage() {
  const { data: vehicles } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertVehicle);
  const del = useServerFn(deleteVehicle);
  const savePricingFn = useServerFn(adminSavePricingProfile);
  const listPricingFn = useServerFn(adminListPricingProfiles);

  const pricingQ = useQuery({ queryKey: ["pricing-profiles"], queryFn: () => listPricingFn() });
  const allProfiles: any[] = pricingQ.data?.profiles ?? [];

  const [form, setForm] = useState<any>(null);
  const [pricing, setPricing] = useState<typeof emptyPricing>(emptyPricing);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // When opening edit, hydrate pricing
  useEffect(() => {
    if (!form) return;
    if (form.id) {
      const existing = allProfiles.find((p) => p.vehicle_id === form.id);
      if (existing) {
        setPricing({
          id: existing.id,
          base_price: Number(existing.base_price),
          via_price: Number(existing.via_price),
          vehicle_add_price_enabled: !!existing.vehicle_add_price_enabled,
          time_extra_from: existing.time_extra_from ?? "",
          time_extra_to: existing.time_extra_to ?? "",
          time_extra_amount: Number(existing.time_extra_amount),
          time_extra_type: existing.time_extra_type,
          status: !!existing.status,
          tiers: (existing.tiers ?? []).map((t: any) => ({
            tier_name: t.tier_name, miles: Number(t.miles),
            cost_per_mile: Number(t.cost_per_mile), sort_order: t.sort_order,
          })),
        });
        return;
      }
    }
    setPricing(emptyPricing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, pricingQ.data]);

  function openNew() { setForm({ ...emptyVehicle }); setPricing(emptyPricing); setStep(0); }
  function openEdit(v: any) { setForm({ ...emptyVehicle, ...v }); setStep(0); }
  function close() { setForm(null); setStep(0); }

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

  async function finalSave() {
    if (!form?.name?.trim()) { toast.error("Vehicle name is required"); setStep(0); return; }
    if (!form?.image_url) { toast.error("Vehicle image is required"); setStep(0); return; }
    if (!pricing.tiers.length) { toast.error("Add at least one mileage tier"); setStep(1); return; }
    setSaving(true);
    try {
      const res: any = await upsert({ data: form });
      const vehicleId = res?.id ?? form.id;
      if (vehicleId) {
        await savePricingFn({
          data: {
            id: pricing.id,
            vehicle_id: vehicleId,
            base_price: pricing.base_price,
            via_price: pricing.via_price,
            vehicle_add_price_enabled: pricing.vehicle_add_price_enabled,
            time_extra_from: pricing.time_extra_from || null,
            time_extra_to: pricing.time_extra_to || null,
            time_extra_amount: pricing.time_extra_amount,
            time_extra_type: pricing.time_extra_type,
            status: pricing.status,
            tiers: pricing.tiers.map((t, i) => ({
              tier_name: t.tier_name || `Next ${t.miles} miles`,
              miles: t.miles, cost_per_mile: t.cost_per_mile, sort_order: i + 1,
            })),
          } as any,
        });
      }
      qc.invalidateQueries({ queryKey: ["admin", "vehicles"] });
      qc.invalidateQueries({ queryKey: ["pricing-profiles"] });
      toast.success("Vehicle saved with mileage pricing");
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Vehicles & Mileage" description="Manage your fleet, classes, and tiered mileage pricing.">
        <Button onClick={openNew}><Plus className="size-4 mr-1" /> Add vehicle</Button>
      </PageHeader>

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" hint="Add your first vehicle to start accepting bookings." action={<Button onClick={openNew}><Plus className="size-4 mr-1" /> Add vehicle</Button>} />
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
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Edit className="size-4" /></Button>
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

      <Dialog open={!!form} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit vehicle" : "Add new vehicle"}</DialogTitle>
          </DialogHeader>

          {/* Stepper header */}
          <div className="flex items-center justify-between gap-2 py-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    <span className={`size-6 rounded-full flex items-center justify-center text-xs ${active ? "bg-primary-foreground/20" : done ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                      {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${done ? "bg-primary" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>

          {form && step === 0 && (
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
              <Field label="Base fare (£)"><Input type="number" step="0.01" value={form.base_fare ?? ""} onChange={e => setForm({ ...form, base_fare: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Per mile (£)"><Input type="number" step="0.01" value={form.per_mile_rate ?? ""} onChange={e => setForm({ ...form, per_mile_rate: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Waiting charge (£/hr)"><Input type="number" step="0.01" value={form.waiting_charge ?? ""} onChange={e => setForm({ ...form, waiting_charge: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Price per hour (£)"><Input type="number" step="0.01" value={form.price_per_hour ?? ""} onChange={e => setForm({ ...form, price_per_hour: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Display order"><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.meet_greet_enabled} onCheckedChange={v => setForm({ ...form, meet_greet_enabled: v })} /><Label>Meet & Greet</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.featured} onCheckedChange={v => setForm({ ...form, featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
            </div>
          )}

          {form && step === 1 && (
            <MileageStep pricing={pricing} setPricing={setPricing} />
          )}

          {form && step === 2 && (
            <ExtrasStep pricing={pricing} setPricing={setPricing} />
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}><ChevronLeft className="size-4 mr-1" /> Back</Button>}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>Next <ChevronRight className="size-4 ml-1" /></Button>
              ) : (
                <Button onClick={finalSave} disabled={saving}>{saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Saving…</> : "Save vehicle"}</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><Label className="mb-1.5 block">{label}</Label>{children}</div>;
}

function MileageStep({ pricing, setPricing }: { pricing: typeof emptyPricing; setPricing: (p: typeof emptyPricing) => void }) {
  const totalMiles = useMemo(() => pricing.tiers.reduce((s, t) => s + (Number(t.miles) || 0), 0), [pricing.tiers]);
  function move(i: number, dir: -1 | 1) {
    const tiers = [...pricing.tiers];
    const j = i + dir;
    if (j < 0 || j >= tiers.length) return;
    [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
    tiers.forEach((x, k) => (x.sort_order = k + 1));
    setPricing({ ...pricing, tiers });
  }
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Minimum Price (£)</Label>
        <div className="relative mt-1.5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
          <Input type="number" step={0.01} value={pricing.base_price}
            onChange={e => setPricing({ ...pricing, base_price: Number(e.target.value || 0) })} className="pl-7 h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-3 px-1 text-xs uppercase tracking-wider font-bold text-muted-foreground">
          <div className="col-span-2" />
          <div className="col-span-5 text-center">Mileage</div>
          <div className="col-span-4 text-center">Cost Per mile (£)</div>
          <div className="col-span-1" />
        </div>

        {pricing.tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-2 flex items-center gap-1">
              <span className="text-sm font-semibold text-foreground/80">Next</span>
              <div className="flex flex-col -ml-0.5">
                <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="size-3" /></button>
                <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="size-3" /></button>
              </div>
            </div>
            <div className="col-span-5">
              <div className="flex border border-border rounded-md overflow-hidden bg-background">
                <Input type="number" step={0.01} value={t.miles}
                  onChange={e => {
                    const tiers = [...pricing.tiers];
                    const miles = Number(e.target.value || 0);
                    tiers[i] = { ...t, miles, tier_name: `Next ${miles} miles` };
                    setPricing({ ...pricing, tiers });
                  }}
                  className="border-0 rounded-none h-11 focus-visible:ring-0" />
                <span className="flex items-center px-3 bg-muted text-sm text-muted-foreground border-l border-border">miles</span>
              </div>
            </div>
            <div className="col-span-4">
              <div className="flex border border-border rounded-md overflow-hidden bg-background">
                <span className="flex items-center px-3 bg-muted text-sm text-muted-foreground border-r border-border">£</span>
                <Input type="number" step={0.0001} value={t.cost_per_mile}
                  onChange={e => {
                    const tiers = [...pricing.tiers];
                    tiers[i] = { ...t, cost_per_mile: Number(e.target.value || 0) };
                    setPricing({ ...pricing, tiers });
                  }}
                  className="border-0 rounded-none h-11 focus-visible:ring-0" />
              </div>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button type="button" size="icon" variant="ghost" className="text-red-600 hover:text-red-700"
                onClick={() => {
                  const tiers = pricing.tiers.filter((_, k) => k !== i);
                  tiers.forEach((x, k) => (x.sort_order = k + 1));
                  setPricing({ ...pricing, tiers });
                }}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" size="sm" variant="outline" className="gap-1.5"
            onClick={() => setPricing({
              ...pricing,
              tiers: [...pricing.tiers, { tier_name: "Next 10 miles", miles: 10, cost_per_mile: 2, sort_order: pricing.tiers.length + 1 }],
            })}>
            <Plus className="size-3.5" /> Add mileage tier
          </Button>
          <span className="text-xs text-muted-foreground">{pricing.tiers.length} tiers · {totalMiles} miles total</span>
        </div>
      </div>
    </div>
  );
}

function ExtrasStep({ pricing, setPricing }: { pricing: typeof emptyPricing; setPricing: (p: typeof emptyPricing) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold">Via Stop Price (£/mile)</Label>
          <div className="flex border border-border rounded-md overflow-hidden bg-background mt-1.5">
            <span className="flex items-center px-3 bg-muted text-sm text-muted-foreground border-r border-border">£</span>
            <Input type="number" step={0.01} value={pricing.via_price}
              onChange={e => setPricing({ ...pricing, via_price: Number(e.target.value || 0) })}
              className="border-0 rounded-none h-11 focus-visible:ring-0" />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Switch checked={pricing.status} onCheckedChange={v => setPricing({ ...pricing, status: v })} />
          <Label>Pricing profile active</Label>
        </div>
      </div>

      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={pricing.vehicle_add_price_enabled}
            onChange={e => setPricing({ ...pricing, vehicle_add_price_enabled: e.target.checked })}
            className="size-5 cursor-pointer" />
          <Label className="font-semibold">Time-based extra charge</Label>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="time" value={pricing.time_extra_from}
              onChange={e => setPricing({ ...pricing, time_extra_from: e.target.value })}
              className="h-11 mt-1" disabled={!pricing.vehicle_add_price_enabled} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="time" value={pricing.time_extra_to}
              onChange={e => setPricing({ ...pricing, time_extra_to: e.target.value })}
              className="h-11 mt-1" disabled={!pricing.vehicle_add_price_enabled} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <Input type="number" step={0.01} value={pricing.time_extra_amount}
              onChange={e => setPricing({ ...pricing, time_extra_amount: Number(e.target.value || 0) })}
              className="h-11 mt-1" disabled={!pricing.vehicle_add_price_enabled} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <div className="flex gap-2 mt-1">
              {(["fixed", "percent"] as const).map(t => (
                <label key={t} className={`flex-1 flex items-center justify-center h-11 border rounded-md cursor-pointer transition ${pricing.time_extra_type === t ? "border-primary bg-primary/10" : "border-border bg-background text-muted-foreground"}`}>
                  <input type="radio" name="extra_type" checked={pricing.time_extra_type === t}
                    onChange={() => setPricing({ ...pricing, time_extra_type: t })}
                    className="sr-only" disabled={!pricing.vehicle_add_price_enabled} />
                  <span className="text-sm font-semibold">{t === "fixed" ? "£" : "%"}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
