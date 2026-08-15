import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, SchemeSection } from "./GeoEditorLayout";
import { saveSchemeOverview } from "@/lib/pricing-schemes.functions";

type Scheme = { classId: string; name: string; pricingVehicleId: string | null };

export type Band = { name: string; miles: number; perMile: number };

export type OverviewState = {
  cityFixedPrice: number;
  cityIncludedMiles: number;
  bands: Band[];
  additionalPickupFee: number;
  waitingFeePerMinute: number;
  airportPickupFee: number;
  connectingJobDiscountPercent: number;
  pricePerHour: number;
  minHours: number;
  maxHours: number;
  hourlyActive: boolean;
  live: boolean;
};

/** Rebuild the Overview mileage bands from the stored consecutive mileage tiers. */
export function overviewFromScheme(data: any): OverviewState {
  const tiers: any[] = data.base.tiers ?? [];
  const paid = tiers.filter((t) => Number(t.costPerMile) > 0);
  const bands: Band[] = paid.map((t, i) => ({
    name: String(t.tierName ?? `Band ${i + 1}`),
    miles: Number(t.miles ?? 0),
    perMile: Number(t.costPerMile ?? 0),
  }));
  return {
    cityFixedPrice: data.base.cityFixedPrice,
    cityIncludedMiles: data.base.cityIncludedMiles || Number(tiers.find((t) => Number(t.costPerMile) === 0)?.miles ?? 0),
    bands: bands.length
      ? bands
      : [
          { name: "Short transfer", miles: 0, perMile: 0 },
          { name: "Medium transfer", miles: 0, perMile: 0 },
          { name: "Long transfer", miles: 0, perMile: 0 },
        ],
    additionalPickupFee: data.base.additionalPickupFee,
    waitingFeePerMinute: data.base.waitingFeePerMinute,
    airportPickupFee: data.base.airportPickupFee,
    connectingJobDiscountPercent: data.base.connectingJobDiscountPercent,
    pricePerHour: data.time.pricePerHour,
    minHours: data.time.minHours,
    maxHours: data.time.maxHours,
    hourlyActive: data.time.active,
    live: data.base.live,
  };
}

const num = (v: string) => (v === "" ? 0 : Number(v));

export function SchemeOverviewTab({ scheme, data, section = "base" }: { scheme: Scheme; data: any; section?: "base" | "time" }) {
  const qc = useQueryClient();
  const save = useServerFn(saveSchemeOverview);
  const [form, setForm] = useState<OverviewState>(() => overviewFromScheme(data));

  useEffect(() => setForm(overviewFromScheme(data)), [data]);

  const set = <K extends keyof OverviewState>(k: K, v: OverviewState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      if (!scheme.pricingVehicleId) throw new Error("Link a pricing vehicle to this class first (Vehicle Classes → Details).");
      return save({ data: { classId: scheme.classId, vehicleId: scheme.pricingVehicleId, ...form } as any });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "pricing-scheme", scheme.classId] }),
        qc.invalidateQueries({ queryKey: ["admin", "pricing-schemes"] }),
        qc.invalidateQueries({ queryKey: ["pricing-profiles"] }),
        qc.invalidateQueries({ queryKey: ["admin", "hourly-rates"] }),
        qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }),
        qc.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
      toast.success("Base pricing saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const coveredMiles = form.cityIncludedMiles + form.bands.reduce((s, b) => s + (Number(b.miles) || 0), 0);

  const setBand = (i: number, patch: Partial<Band>) =>
    setForm((f) => ({ ...f, bands: f.bands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) }));
  const addBand = () =>
    setForm((f) => ({ ...f, bands: [...f.bands, { name: `Band ${f.bands.length + 1}`, miles: 0, perMile: 0 }] }));
  const removeBand = (i: number) => setForm((f) => ({ ...f, bands: f.bands.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6 max-w-5xl">
      {!scheme.pricingVehicleId && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>This class has no pricing vehicle linked yet, so base pricing cannot be stored. Link one in Vehicle Classes → Details.</span>
        </div>
      )}

      {section === "base" && (<>
      <SchemeSection title="Base pricing" hint="The fixed city fare plus consecutive per-mile bands. Distances are statute miles.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scheme name">
            <Input value={scheme.name} readOnly className="bg-muted/50" />
          </Field>
          <Field label="City transfer fixed price (£)" hint="Charged for any journey inside the included distance.">
            <Input type="number" step="0.01" min="0" value={form.cityFixedPrice}
              onChange={(e) => set("cityFixedPrice", num(e.target.value))} />
          </Field>
          <Field label="City distance included (miles)">
            <Input type="number" step="0.1" min="0" value={form.cityIncludedMiles}
              onChange={(e) => set("cityIncludedMiles", num(e.target.value))} />
          </Field>
          <div className="hidden sm:block" />
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Mileage bands</p>
            <Button type="button" variant="outline" size="sm" onClick={addBand}>
              <Plus className="mr-1.5 size-4" /> Add band
            </Button>
          </div>

          {form.bands.length === 0 && (
            <p className="text-xs text-muted-foreground">No bands yet — add one to charge per mile beyond the included distance.</p>
          )}

          {form.bands.map((b, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_140px_140px_auto] sm:items-end">
              <Field label={`Band ${i + 1} name`}>
                <Input value={b.name} onChange={(e) => setBand(i, { name: e.target.value })} />
              </Field>
              <Field label="Next miles">
                <Input type="number" step="0.1" min="0" value={b.miles} onChange={(e) => setBand(i, { miles: num(e.target.value) })} />
              </Field>
              <Field label="£ per mile">
                <Input type="number" step="0.01" min="0" value={b.perMile} onChange={(e) => setBand(i, { perMile: num(e.target.value) })} />
              </Field>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove band ${i + 1}`} onClick={() => removeBand(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground tabular-nums">
          Bands cover the first {coveredMiles.toFixed(1)} miles. Anything beyond that is not charged per mile — add another band or extend the last one.
        </p>
      </SchemeSection>

      </>)}

      {section === "time" && (
      <SchemeSection title="Time pricing" hint="Used by hourly hire and as-directed bookings for this class.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price per hour (£)">
            <Input type="number" step="0.01" min="0" value={form.pricePerHour} onChange={(e) => set("pricePerHour", num(e.target.value))} />
          </Field>
          <Field label="Minimum hours">
            <Input type="number" min="1" value={form.minHours} onChange={(e) => set("minHours", num(e.target.value))} />
          </Field>
          <Field label="Maximum hours (per day)">
            <Input type="number" min="1" value={form.maxHours} onChange={(e) => set("maxHours", num(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border px-4 py-3">
          <Switch id="hourly-active" checked={form.hourlyActive} onCheckedChange={(v) => set("hourlyActive", v)} />
          <label htmlFor="hourly-active" className="text-sm">Offer hourly hire for this class</label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          A full day at the maximum hours costs £{(form.pricePerHour * form.maxHours).toFixed(2)}.
        </p>
      </SchemeSection>

      )}

      {section === "base" && (
      <SchemeSection title="Core fees" hint="Applied by the same server engine that prices public quotes.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Additional pickup fee (£ per extra pickup)">
            <Input type="number" step="0.01" min="0" value={form.additionalPickupFee} onChange={(e) => set("additionalPickupFee", num(e.target.value))} />
          </Field>
          <Field label="Additional waiting fee (£ per minute)">
            <Input type="number" step="0.01" min="0" value={form.waitingFeePerMinute} onChange={(e) => set("waitingFeePerMinute", num(e.target.value))} />
          </Field>
          <Field label="Airport pickup fee (£)" hint="Added once on airport services.">
            <Input type="number" step="0.01" min="0" value={form.airportPickupFee} onChange={(e) => set("airportPickupFee", num(e.target.value))} />
          </Field>
          <Field label="Connecting-job discount (%)" hint="Taken off when a job connects to another booking.">
            <Input type="number" step="0.1" min="0" max="100" value={form.connectingJobDiscountPercent}
              onChange={(e) => set("connectingJobDiscountPercent", num(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border px-4 py-3">
          <Switch id="scheme-live" checked={form.live} onCheckedChange={(v) => set("live", v)} />
          <label htmlFor="scheme-live" className="text-sm">Scheme live — quote this class on the website</label>
        </div>
      </SchemeSection>

      )}

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !scheme.pricingVehicleId}>
          {mutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}Save {section === "base" ? "base pricing" : "time pricing"}
        </Button>
      </div>
    </div>
  );
}
