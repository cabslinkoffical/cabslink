import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/ui";
import { emptyPricing, ExtrasEditor, HeroImageUploader, MileageEditor, type PricingForm } from "@/components/admin/PricingEditors";
import {
  listVehicleClassesAdmin, upsertVehicleClass, upsertVehicleModel, deleteVehicleModel,
} from "@/lib/vehicle-classes.functions";
import { listVehiclesAdmin } from "@/lib/admin.functions";
import { adminListPricingProfiles, adminSavePricingProfile } from "@/lib/pricing.functions";
import { adminListHourlyRates, adminSaveHourlyRate } from "@/lib/hourly.functions";
import { listAvailabilityRules, upsertAvailabilityRule, deleteAvailabilityRule } from "@/lib/pricing-admin.functions";

const classOpts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });
const vehicleOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
const profileOpts = queryOptions({ queryKey: ["pricing-profiles"], queryFn: () => adminListPricingProfiles() });
const hourlyOpts = queryOptions({ queryKey: ["admin", "hourly-rates"], queryFn: () => adminListHourlyRates() });
const availOpts = queryOptions({ queryKey: ["admin", "availability-rules"], queryFn: () => listAvailabilityRules() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/vehicle-classes/$id")({
  head: () => ({
    meta: [
      { title: "Edit Vehicle Class — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: edit a vehicle class, its pricing and availability in one place." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(classOpts),
    context.queryClient.ensureQueryData(vehicleOpts),
    context.queryClient.ensureQueryData(profileOpts),
    context.queryClient.ensureQueryData(hourlyOpts),
    context.queryClient.ensureQueryData(availOpts),
  ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  component: EditorPage,
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
  ["long_distance", "Long distance"], ["tours", "Tours"], ["executive", "Executive"],
];

const emptyClass: any = {
  id: undefined, name: "", slug: "", hero_image: "", short_description: "", long_description: "",
  passengers: 3, large_luggage: 2, cabin_bags: 2, hand_luggage: 0,
  child_seats_supported: true, wheelchair_accessible: false, fuel_type: "petrol_diesel",
  recommended_for: {}, featured: false, badge: "", display_order: 0, active: true, quote_on_request: false,
  pricing_vehicle_id: null, seo_title: "", seo_description: "", seo_keywords: "",
};

function EditorPage() {
  const { id } = useParams({ from: "/_authenticated/cabs-booking-pannel/vehicle-classes/$id" });
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: classData } = useSuspenseQuery(classOpts);
  const { data: vehicles } = useSuspenseQuery(vehicleOpts);
  const { data: profileData } = useSuspenseQuery(profileOpts);
  const { data: hourlyRows } = useSuspenseQuery(hourlyOpts);
  const { data: availRules } = useSuspenseQuery(availOpts);

  const saveClassFn = useServerFn(upsertVehicleClass);
  const savePricingFn = useServerFn(adminSavePricingProfile);
  const saveHourlyFn = useServerFn(adminSaveHourlyRate);
  const saveModelFn = useServerFn(upsertVehicleModel);
  const delModelFn = useServerFn(deleteVehicleModel);
  const saveRuleFn = useServerFn(upsertAvailabilityRule);
  const delRuleFn = useServerFn(deleteAvailabilityRule);

  const existing = useMemo(
    () => (classData.classes as any[]).find((c) => c.id === id) ?? null,
    [classData.classes, id],
  );

  const [form, setForm] = useState<any>(() =>
    isNew ? { ...emptyClass } : { ...emptyClass, ...(existing ?? {}), recommended_for: existing?.recommended_for ?? {} });
  const [pricing, setPricing] = useState<PricingForm>(emptyPricing);
  const [hourly, setHourly] = useState({ pricePerHour: 0, minHours: 3, maxHours: 12, active: false });
  const [saving, setSaving] = useState(false);

  const linkedVehicleId: string | null = form.pricing_vehicle_id ?? null;
  const profiles: any[] = (profileData as any)?.profiles ?? [];

  // Hydrate pricing + hourly for the linked representative vehicle.
  useEffect(() => {
    if (!linkedVehicleId) { setPricing(emptyPricing); return; }
    const p = profiles.find((x) => x.vehicle_id === linkedVehicleId);
    setPricing(p
      ? {
          id: p.id,
          base_price: Number(p.base_price),
          via_price: Number(p.via_price),
          vehicle_add_price_enabled: !!p.vehicle_add_price_enabled,
          time_extra_from: p.time_extra_from ?? "",
          time_extra_to: p.time_extra_to ?? "",
          time_extra_amount: Number(p.time_extra_amount),
          time_extra_type: p.time_extra_type,
          status: !!p.status,
          tiers: (p.tiers ?? []).map((t: any) => ({
            tier_name: t.tier_name, miles: Number(t.miles),
            cost_per_mile: Number(t.cost_per_mile), sort_order: t.sort_order,
          })),
        }
      : emptyPricing);
    const h = (hourlyRows as any[]).find((r) => r.vehicleId === linkedVehicleId);
    setHourly({
      pricePerHour: Number(h?.pricePerHour ?? 0),
      minHours: Number(h?.minHours ?? 3),
      maxHours: Number(h?.maxHours ?? 12),
      active: !!h?.active,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedVehicleId, profileData, hourlyRows]);

  const models = useMemo(
    () => (classData.models as any[]).filter((m) => m.vehicle_class_id === id),
    [classData.models, id],
  );
  const rules = useMemo(
    () => (availRules as any[]).filter((r) => r.vehicle_class_id === id),
    [availRules, id],
  );

  async function saveAll() {
    if (!form.name?.trim()) { toast.error("Give the class a name"); return; }
    if (!form.slug?.trim()) { toast.error("Give the class a URL slug"); return; }
    setSaving(true);
    try {
      const payload = { ...form, hero_image: form.hero_image || null };
      const res: any = await saveClassFn({ data: payload });
      const classId = res?.id ?? id;

      if (linkedVehicleId) {
        if (pricing.tiers.length) {
          await savePricingFn({
            data: {
              id: pricing.id,
              vehicle_id: linkedVehicleId,
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
        await saveHourlyFn({
          data: {
            vehicleId: linkedVehicleId,
            pricePerHour: Number(hourly.pricePerHour) || 0,
            minHours: Number(hourly.minHours) || 1,
            maxHours: Number(hourly.maxHours) || 12,
            active: hourly.active,
          },
        });
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] }),
        qc.invalidateQueries({ queryKey: ["pricing-profiles"] }),
        qc.invalidateQueries({ queryKey: ["admin", "hourly-rates"] }),
        qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }),
        qc.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
      toast.success("Saved");
      if (isNew && classId) navigate({ to: "/cabs-booking-pannel/vehicle-classes/$id", params: { id: classId } });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && !existing) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-muted-foreground">This vehicle class no longer exists.</p>
        <Button asChild variant="outline"><Link to="/cabs-booking-pannel/vehicle-classes">Back to classes</Link></Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Tabs defaultValue="details">
        {/* Sticky action bar + tabs */}
        <div className="sticky top-14 z-10 bg-card/95 backdrop-blur border-b border-border px-4 md:px-8 pt-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to classes">
              <Link to="/cabs-booking-pannel/vehicle-classes"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold truncate">{form.name || (isNew ? "New vehicle class" : "Vehicle class")}</h1>
              <p className="hidden sm:block text-xs text-muted-foreground">Everything for this class — details, pricing, hourly hire and availability.</p>
            </div>
            <div className="flex-1" />
            {!isNew && <StatusBadge status={form.active ? "active" : "inactive"} />}
            <Button onClick={saveAll} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}Save
            </Button>
          </div>
          <TabsList className="mt-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4 md:p-8">


          {/* ---------------- DETAILS ---------------- */}
          <TabsContent value="details" className="space-y-6 max-w-4xl">
            <Section title="Basics">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="URL slug">
                  <Input value={form.slug} onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
                </Field>
                <Field label="Short description" className="sm:col-span-2">
                  <Input value={form.short_description ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, short_description: e.target.value }))} />
                </Field>
                <Field label="Full description" className="sm:col-span-2">
                  <Textarea rows={3} value={form.long_description ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, long_description: e.target.value }))} />
                </Field>
                <Field label="Photo" className="sm:col-span-2" hint="Paste an image URL or upload one.">
                  <div className="flex gap-2">
                    <Input value={form.hero_image ?? ""} placeholder="https://…"
                      onChange={(e) => setForm((f: any) => ({ ...f, hero_image: e.target.value }))} />
                    <HeroImageUploader slug={form.slug || "class"} onUploaded={(url) => setForm((f: any) => ({ ...f, hero_image: url }))} />
                  </div>
                  {form.hero_image && <img src={form.hero_image} alt={`${form.name || "Vehicle class"} photo preview`} className="mt-2 h-24 rounded border object-cover" />}
                </Field>
              </div>
            </Section>

            <Section title="Capacity & features">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Passengers"><Input type="number" value={form.passengers} onChange={(e) => setForm((f: any) => ({ ...f, passengers: Number(e.target.value) }))} /></Field>
                <Field label="Large luggage"><Input type="number" value={form.large_luggage} onChange={(e) => setForm((f: any) => ({ ...f, large_luggage: Number(e.target.value) }))} /></Field>
                <Field label="Cabin bags"><Input type="number" value={form.cabin_bags} onChange={(e) => setForm((f: any) => ({ ...f, cabin_bags: Number(e.target.value) }))} /></Field>
                <Field label="Hand luggage"><Input type="number" value={form.hand_luggage} onChange={(e) => setForm((f: any) => ({ ...f, hand_luggage: Number(e.target.value) }))} /></Field>
                <Field label="Fuel type" className="col-span-2">
                  <Select value={form.fuel_type} onValueChange={(v) => setForm((f: any) => ({ ...f, fuel_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FUEL_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Badge (optional)" className="col-span-2"><Input value={form.badge ?? ""} placeholder="e.g. Most popular" onChange={(e) => setForm((f: any) => ({ ...f, badge: e.target.value }))} /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <Toggle label="Child seats supported" checked={!!form.child_seats_supported} onChange={(v) => setForm((f: any) => ({ ...f, child_seats_supported: v }))} />
                <Toggle label="Wheelchair accessible" checked={!!form.wheelchair_accessible} onChange={(v) => setForm((f: any) => ({ ...f, wheelchair_accessible: v }))} />
                <Toggle label="Show on website" checked={!!form.active} onChange={(v) => setForm((f: any) => ({ ...f, active: v }))} />
                <Toggle label="Feature on homepage" checked={!!form.featured} onChange={(v) => setForm((f: any) => ({ ...f, featured: v }))} />
              </div>
            </Section>

            <Section title="Models in this class" hint="Cars the customer may receive. Customers book the class, not a model.">
              {isNew ? (
                <p className="text-sm text-muted-foreground">Save the class first, then add models.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {models.length === 0 && <span className="text-sm text-muted-foreground">No models yet.</span>}
                    {models.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                        {m.name}
                        <button aria-label={`Remove ${m.name}`} className="opacity-50 hover:opacity-100"
                          onClick={async () => {
                            await delModelFn({ data: { id: m.id } });
                            qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] });
                          }}>
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <AddModel classId={id} onAdded={async (name, manufacturer) => {
                    await saveModelFn({ data: { vehicle_class_id: id, name, manufacturer, active: true, display_order: models.length } as any });
                    qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] });
                  }} />
                </>
              )}
            </Section>

            <Section title="Search listing (SEO)" hint="Leave blank to use the class name and description.">
              <div className="space-y-4">
                <Field label="Page title"><Input value={form.seo_title ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, seo_title: e.target.value }))} /></Field>
                <Field label="Meta description"><Textarea rows={2} value={form.seo_description ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, seo_description: e.target.value }))} /></Field>
                <Field label="Order on fleet page" hint="Lower numbers appear first.">
                  <Input type="number" className="max-w-[140px]" value={form.display_order} onChange={(e) => setForm((f: any) => ({ ...f, display_order: Number(e.target.value) }))} />
                </Field>
                <div>
                  <Label className="mb-2 block">Best suited to</Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {REC_KEYS.map(([k, l]) => (
                      <Toggle key={k} label={l} checked={!!form.recommended_for?.[k]}
                        onChange={(v) => setForm((f: any) => ({ ...f, recommended_for: { ...(f.recommended_for ?? {}), [k]: v } }))} />
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* ---------------- PRICING ---------------- */}
          <TabsContent value="pricing" className="space-y-6 max-w-4xl">
            <Section title="How this class is priced" hint="Prices live on the class itself — there is no separate vehicle record to link.">
              <Toggle label="Quote on request only (no automatic price)" checked={!!form.quote_on_request}
                onChange={(v) => setForm((f: any) => ({ ...f, quote_on_request: v }))} />
            </Section>

            {form.quote_on_request ? (
              <p className="text-sm text-muted-foreground">This class is quote-on-request, so automatic pricing is switched off.</p>
            ) : (
              <>
                <Section title="Distance pricing">
                  <MileageEditor pricing={pricing} setPricing={setPricing} />
                </Section>
                <Section title="Extras & peak times">
                  <ExtrasEditor pricing={pricing} setPricing={setPricing} />
                </Section>
                <Section title="Hourly hire">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                    <Field label="£ per hour"><Input type="number" step="0.5" min={0} value={hourly.pricePerHour} onChange={(e) => setHourly((h) => ({ ...h, pricePerHour: Number(e.target.value) }))} /></Field>
                    <Field label="Min hours"><Input type="number" min={1} max={24} value={hourly.minHours} onChange={(e) => setHourly((h) => ({ ...h, minHours: Number(e.target.value) }))} /></Field>
                    <Field label="Max hours"><Input type="number" min={1} max={24} value={hourly.maxHours} onChange={(e) => setHourly((h) => ({ ...h, maxHours: Number(e.target.value) }))} /></Field>
                    <Toggle label="Offer hourly hire" checked={hourly.active} onChange={(v) => setHourly((h) => ({ ...h, active: v }))} />
                  </div>
                </Section>
              </>
            )}
          </TabsContent>

          {/* ---------------- AVAILABILITY ---------------- */}
          <TabsContent value="availability" className="space-y-6 max-w-4xl">
            <Section title="When this class can't be booked" hint="Add a date range to close this class. Leave dates blank to close it entirely.">
              {isNew ? (
                <p className="text-sm text-muted-foreground">Save the class first, then add availability blocks.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {rules.length === 0 && <p className="text-sm text-muted-foreground">No blocks — this class is always bookable.</p>}
                    {rules.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.effect === "block" ? "Blocked" : "Allowed"}
                            {r.date_from || r.date_to ? ` · ${r.date_from ?? "any"} → ${r.date_to ?? "any"}` : " · all dates"}
                            {r.reason ? ` · ${r.reason}` : ""}
                          </div>
                        </div>
                        <StatusBadge status={r.active ? "active" : "inactive"} />
                        <Button aria-label={`Delete ${r.name}`} size="icon" variant="ghost" className="text-destructive"
                          onClick={async () => {
                            await delRuleFn({ data: { id: r.id } });
                            qc.invalidateQueries({ queryKey: ["admin", "availability-rules"] });
                            toast.success("Block removed");
                          }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <AddBlock onAdd={async (v) => {
                    await saveRuleFn({
                      data: {
                        name: v.name, rule_scope: "vehicle_class", effect: "block",
                        vehicle_class_id: id, date_from: v.date_from || null, date_to: v.date_to || null,
                        reason: v.reason || null, priority: 100, active: true, scope: "either",
                      } as any,
                    });
                    qc.invalidateQueries({ queryKey: ["admin", "availability-rules"] });
                    toast.success("Block added");
                  }} />
                </>
              )}
            </Section>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="admin-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function AddModel({ classId, onAdded }: { classId: string; onAdded: (name: string, manufacturer: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col sm:flex-row gap-2 pt-2">
      <Input placeholder="Model, e.g. Mercedes E-Class" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Manufacturer (optional)" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
      <Button variant="outline" disabled={!name.trim() || busy || !classId}
        onClick={async () => {
          setBusy(true);
          try { await onAdded(name.trim(), manufacturer.trim()); setName(""); setManufacturer(""); }
          catch (e: any) { toast.error(e.message ?? "Could not add model"); }
          finally { setBusy(false); }
        }}>
        <Plus className="size-4 mr-1.5" />Add
      </Button>
    </div>
  );
}

function AddBlock({ onAdd }: { onAdd: (v: { name: string; date_from: string; date_to: string; reason: string }) => Promise<void> }) {
  const [v, setV] = useState({ name: "", date_from: "", date_to: "", reason: "" });
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid sm:grid-cols-4 gap-3 items-end pt-2 border-t border-border">
      <Field label="Block name"><Input value={v.name} placeholder="e.g. Christmas closure" onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="From"><Input type="date" value={v.date_from} onChange={(e) => setV({ ...v, date_from: e.target.value })} /></Field>
      <Field label="To"><Input type="date" value={v.date_to} onChange={(e) => setV({ ...v, date_to: e.target.value })} /></Field>
      <Button variant="outline" disabled={v.name.trim().length < 2 || busy}
        onClick={async () => {
          setBusy(true);
          try { await onAdd(v); setV({ name: "", date_from: "", date_to: "", reason: "" }); }
          catch (e: any) { toast.error(e.message ?? "Could not add block"); }
          finally { setBusy(false); }
        }}>
        <Plus className="size-4 mr-1.5" />Add block
      </Button>
    </div>
  );
}
