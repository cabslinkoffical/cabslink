import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPricingProfiles, adminPreviewQuote } from "@/lib/pricing.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/admin/ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const pOpts = queryOptions({ queryKey: ["pricing-profiles"], queryFn: () => adminListPricingProfiles() });

export const Route = createFileRoute("/_authenticated/admin/pricing-preview")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pOpts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(pOpts);
  const previewFn = useServerFn(adminPreviewQuote);

  const [form, setForm] = useState({
    pickupPlaceId: "",
    pickupLabel: "",
    destinationPlaceId: "",
    destinationLabel: "",
    distanceMiles: 20,
    vehicleId: "",
    vehicleCount: 1,
    viaStops: 0,
    pickupDate: "",
    pickupTime: "",
    discountAmount: 0,
  });

  const mut = useMutation({
    mutationFn: () => previewFn({ data: form as any }),
    onError: (e: any) => toast.error(e.message ?? "Preview failed"),
  });

  const r = mut.data;
  const snap = r?.snapshot;
  const sym = snap?.currency_symbol ?? "£";
  const money = (n: number | null | undefined) => `${sym}${Number(n ?? 0).toFixed(2)}`;

  const availableVehicles = data.vehicles.filter((v: any) =>
    data.profiles.some((p: any) => p.vehicle_id === v.id && p.status),
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <PageHeader
        title="Quote Preview"
        description="Runs the real production pricing engine. Mirrors the customer booking widget exactly."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="font-semibold">Inputs</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Pickup Place ID *</Label><Input value={form.pickupPlaceId} onChange={e => setForm({ ...form, pickupPlaceId: e.target.value })} placeholder="ChIJ…" /></div>
            <div className="col-span-2"><Label>Pickup label *</Label><Input value={form.pickupLabel} onChange={e => setForm({ ...form, pickupLabel: e.target.value })} /></div>
            <div className="col-span-2"><Label>Destination Place ID *</Label><Input value={form.destinationPlaceId} onChange={e => setForm({ ...form, destinationPlaceId: e.target.value })} placeholder="ChIJ…" /></div>
            <div className="col-span-2"><Label>Destination label *</Label><Input value={form.destinationLabel} onChange={e => setForm({ ...form, destinationLabel: e.target.value })} /></div>
            <div><Label>Distance miles (override)</Label><Input type="number" step="0.1" value={form.distanceMiles} onChange={e => setForm({ ...form, distanceMiles: Number(e.target.value) })} /></div>
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicleId} onValueChange={v => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Vehicle count</Label><Input type="number" min={1} max={20} value={form.vehicleCount} onChange={e => setForm({ ...form, vehicleCount: Number(e.target.value) })} /></div>
            <div><Label>Via stops</Label><Input type="number" min={0} max={10} value={form.viaStops} onChange={e => setForm({ ...form, viaStops: Number(e.target.value) })} /></div>
            <div><Label>Pickup date</Label><Input type="date" value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} /></div>
            <div><Label>Pickup time</Label><Input type="time" value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} /></div>
            <div><Label>Discount (£)</Label><Input type="number" step="0.01" min={0} value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: Number(e.target.value) })} /></div>
          </div>
          <Button
            className="w-full"
            disabled={mut.isPending || !form.pickupPlaceId || !form.destinationPlaceId || !form.vehicleId}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? <><Loader2 className="size-4 mr-1 animate-spin" /> Calculating…</> : "Run preview"}
          </Button>
        </div>

        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="font-semibold">Result</h3>
          {!snap ? (
            <p className="text-sm text-muted-foreground">Fill the form and click Run preview.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Fixed price applied" value={snap.fixed_price_applied ? "Yes" : "No"} />
              {snap.fixed_price_applied && <Row label="Fixed price" value={money(snap.fixed_price_amount)} />}
              <Row label="Base price" value={money(snap.base_price)} />
              {snap.mileage_tiers.map((t: any, i: number) => (
                <Row key={i} label={`↳ ${t.tier_name} (${t.miles} × ${money(t.rate)})`} value={money(t.amount)} />
              ))}
              <Row label="Mileage total" value={money(snap.mileage_total)} />
              <Row label={`Via stops (${snap.via_stops})`} value={money(snap.via_price)} />
              <Row label="Time extra" value={money(snap.time_extra)} />
              <Row label="Pickup surcharge" value={money(snap.pickup_surcharge)} />
              <Row label="Dropoff surcharge" value={money(snap.dropoff_surcharge)} />
              <Row label="Discount" value={`− ${money(snap.discount)}`} />
              <Row label={`Tax (${(snap.tax_rate * 100).toFixed(0)}%)`} value={money(snap.tax_amount)} />
              <Row label="Per-vehicle total" value={money(snap.per_vehicle_total)} />
              <Row label="Vehicle count" value={String(snap.vehicle_count)} />
              <Row label="Final total" value={money(snap.final_total)} bold />
              <div className="pt-3">
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Raw snapshot JSON</summary>
                  <pre className="mt-2 p-3 rounded bg-muted overflow-auto max-h-64">{JSON.stringify(snap, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border/60 py-1.5 ${bold ? "font-bold text-base pt-2" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
