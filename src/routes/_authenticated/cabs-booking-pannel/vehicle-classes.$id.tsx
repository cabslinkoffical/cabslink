import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/ui";
import { HeroImageUploader } from "@/components/admin/PricingEditors";
import {
  listVehicleClassesAdmin, upsertVehicleClass, upsertVehicleModel, deleteVehicleModel,
  ensureClassPricingRecord,
} from "@/lib/vehicle-classes.functions";

const classOpts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/vehicle-classes/$id")({
  head: () => ({
    meta: [
      { title: "Edit Vehicle Class — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: edit a vehicle class, its models and listing details." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(classOpts),
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

  const saveClassFn = useServerFn(upsertVehicleClass);
  const ensurePricingFn = useServerFn(ensureClassPricingRecord);
  const saveModelFn = useServerFn(upsertVehicleModel);
  const delModelFn = useServerFn(deleteVehicleModel);

  const existing = useMemo(
    () => (classData.classes as any[]).find((c) => c.id === id) ?? null,
    [classData.classes, id],
  );

  const [form, setForm] = useState<any>(() =>
    isNew ? { ...emptyClass } : { ...emptyClass, ...(existing ?? {}), recommended_for: existing?.recommended_for ?? {} });
  const [saving, setSaving] = useState(false);

  const models = useMemo(
    () => (classData.models as any[]).filter((m) => m.vehicle_class_id === id),
    [classData.models, id],
  );

  async function saveAll() {
    if (!form.name?.trim()) { toast.error("Give the class a name"); return; }
    if (!form.slug?.trim()) { toast.error("Give the class a URL slug"); return; }
    setSaving(true);
    try {
      const payload = { ...form, hero_image: form.hero_image || null };
      const res: any = await saveClassFn({ data: payload });
      const classId = res?.id ?? id;

      // Make sure the class has a pricing record so its pricing scheme can be edited.
      if (!form.quote_on_request && classId) {
        await ensurePricingFn({ data: { classId } });
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
      <div>
        {/* Sticky action bar */}
        <div className="sticky top-14 z-10 bg-card/95 backdrop-blur border-b border-border px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to classes">
              <Link to="/cabs-booking-pannel/vehicle-classes"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold truncate">{form.name || (isNew ? "New vehicle class" : "Vehicle class")}</h1>
              <p className="hidden sm:block text-xs text-muted-foreground">Class details and models. Pricing and availability are managed in their own sections.</p>
            </div>
            <div className="flex-1" />
            {!isNew && <StatusBadge status={form.active ? "active" : "inactive"} />}
            <Button onClick={saveAll} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}Save
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-8">
          <div className="space-y-6 max-w-4xl">
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
            <Section title="Automatic pricing" hint="Switch off to make this class quote-on-request.">
              <Toggle label="Quote on request only (no automatic price)" checked={!!form.quote_on_request}
                onChange={(v) => setForm((f: any) => ({ ...f, quote_on_request: v }))} />
            </Section>

            <Section title="Pricing & availability" hint="These live in their own sections so each setting has exactly one place to be edited.">
              {isNew ? (
                <p className="text-sm text-muted-foreground">Save the class first, then set up its pricing scheme and availability rules.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link to="/cabs-booking-pannel/pricing-schemes/$id" params={{ id }}>Edit pricing scheme</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/cabs-booking-pannel/availability">Availability rules</Link>
                  </Button>
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
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
