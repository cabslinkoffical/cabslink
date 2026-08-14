import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPricingProfiles, adminPreviewQuote } from "@/lib/pricing.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/admin/ui";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

const pOpts = queryOptions({ queryKey: ["pricing-profiles"], queryFn: () => adminListPricingProfiles() });

const SERVICE_TYPES = [
  { value: "", label: "Any / unset" },
  { value: "direct_transfer", label: "Direct transfer" },
  { value: "airport_transfer", label: "Airport transfer" },
  { value: "hourly", label: "Hourly hire" },
  { value: "tour", label: "Tour" },
  { value: "corporate", label: "Corporate" },
];

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/pricing-preview")({
  head: () => ({
    meta: [
      { title: "Pricing Preview — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: pricing preview." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pOpts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(pOpts);
  const previewFn = useServerFn(adminPreviewQuote);

  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [destination, setDestination] = useState<SelectedPlace | null>(null);
  const [useOverride, setUseOverride] = useState(false);
  const [form, setForm] = useState({
    distanceMiles: 20,
    vehicleId: "",
    vehicleCount: 1,
    viaStops: 0,
    pickupDate: "",
    pickupTime: "",
    discountAmount: 0,
    serviceType: "",
    isReturn: false,
    couponCode: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      previewFn({
        data: {
          pickupPlaceId: pickup!.placeId,
          pickupLabel: pickup!.label,
          destinationPlaceId: destination!.placeId,
          destinationLabel: destination!.label,
          // Live Routes API distance unless an override is explicitly enabled.
          distanceMiles: useOverride ? form.distanceMiles : undefined,
          vehicleId: form.vehicleId,
          vehicleCount: form.vehicleCount,
          viaStops: form.viaStops,
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          discountAmount: form.discountAmount,
          serviceType: form.serviceType || undefined,
          isReturn: form.isReturn,
          couponCode: form.couponCode.trim() || null,
        } as any,
      }),
    onError: (e: any) => toast.error(e.message ?? "Preview failed"),
  });

  const r = mut.data;
  const snap = r?.snapshot;
  const dbg = r?.debug;
  const sym = snap?.currency_symbol ?? "£";
  const money = (n: number | null | undefined) => `${sym}${Number(n ?? 0).toFixed(2)}`;

  const availableVehicles = data.vehicles.filter((v: any) =>
    data.profiles.some((p: any) => p.vehicle_id === v.id && p.status),
  );

  const ready = !!pickup?.placeId && !!destination?.placeId && !!form.vehicleId;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <PageHeader
        title="Quote Preview"
        description="Runs the real production pricing engine — the same server path as the customer booking widget — and explains which rule won."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="font-semibold">Journey</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="preview-pickup">Pickup *</Label>
              <PlaceAutocomplete id="preview-pickup" value={pickup} onChange={setPickup} placeholder="Search a pickup address" />
            </div>
            <div>
              <Label htmlFor="preview-dropoff">Destination *</Label>
              <PlaceAutocomplete id="preview-dropoff" value={destination} onChange={setDestination} placeholder="Search a destination" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <Label htmlFor="preview-vehicle">Vehicle class *</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger id="preview-vehicle" className="mt-1"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="preview-service">Service type</Label>
              <Select value={form.serviceType || "__any"} onValueChange={(v) => setForm({ ...form, serviceType: v === "__any" ? "" : v })}>
                <SelectTrigger id="preview-service" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s.value || "__any"} value={s.value || "__any"}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="preview-date">Pickup date</Label><Input id="preview-date" type="date" value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} /></div>
            <div><Label htmlFor="preview-time">Pickup time</Label><Input id="preview-time" type="time" value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} /></div>
            <div><Label htmlFor="preview-count">Vehicle count</Label><Input id="preview-count" type="number" min={1} max={20} value={form.vehicleCount} onChange={e => setForm({ ...form, vehicleCount: Number(e.target.value) })} /></div>
            <div><Label htmlFor="preview-stops">Via stops</Label><Input id="preview-stops" type="number" min={0} max={10} value={form.viaStops} onChange={e => setForm({ ...form, viaStops: Number(e.target.value) })} /></div>
            <div><Label htmlFor="preview-coupon">Promo code</Label><Input id="preview-coupon" value={form.couponCode} onChange={e => setForm({ ...form, couponCode: e.target.value })} placeholder="Optional" /></div>
            <div><Label htmlFor="preview-manual">Manual discount (£)</Label><Input id="preview-manual" type="number" step="0.01" min={0} value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: Number(e.target.value) })} /></div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
            <Label htmlFor="preview-return" className="text-sm font-normal">Return journey</Label>
            <Switch id="preview-return" checked={form.isReturn} onCheckedChange={(v) => setForm({ ...form, isReturn: v })} />
          </div>

          <div className="rounded-lg border border-border/70 px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="preview-override" className="text-sm font-normal">Override distance (testing only)</Label>
              <Switch id="preview-override" checked={useOverride} onCheckedChange={setUseOverride} />
            </div>
            {useOverride && (
              <Input aria-label="Override distance in miles" type="number" step="0.1" min={0} value={form.distanceMiles} onChange={e => setForm({ ...form, distanceMiles: Number(e.target.value) })} />
            )}
            {!useOverride && <p className="text-xs text-muted-foreground">Distance and duration come from the live Routes API, exactly as customer quotes do.</p>}
          </div>

          <Button className="w-full" disabled={mut.isPending || !ready} onClick={() => mut.mutate()}>
            {mut.isPending ? <><Loader2 className="size-4 mr-1 animate-spin" /> Calculating…</> : "Run preview"}
          </Button>
        </div>

        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="font-semibold">Result</h3>
          {!snap ? (
            <p className="text-sm text-muted-foreground">Choose a pickup, destination and vehicle class, then run the preview.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2 pb-2">
                <Chip>Source: {dbg?.pricingSource ?? "mileage"}</Chip>
                <Chip>{Number(r!.distanceMiles).toFixed(1)} mi</Chip>
                {r!.durationMinutes > 0 && <Chip>{r!.durationMinutes} min</Chip>}
                <Chip>VAT {dbg?.taxMode ?? "exclusive"}</Chip>
                {dbg?.availability?.available === false ? (
                  <Chip tone="danger"><XCircle className="size-3" /> Blocked</Chip>
                ) : (
                  <Chip tone="ok"><CheckCircle2 className="size-3" /> Available</Chip>
                )}
              </div>

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
              {(dbg?.ruleSurcharges ?? []).map((s: any, i: number) => (
                <Row key={`rs-${i}`} label={`↳ rule surcharge · ${s.label ?? s.name ?? "surcharge"}`} value={money(s.amount)} />
              ))}
              {(dbg?.modifiers ?? []).map((m: any, i: number) => (
                <Row key={`mo-${i}`} label={`↳ modifier · ${m.name}`} value={m.modifier_type === "percent" ? `${m.value}%` : money(m.value)} />
              ))}
              {(dbg?.ruleDiscounts ?? []).map((d: any, i: number) => (
                <Row key={`rd-${i}`} label={`↳ ${d.label ?? "rule discount"}`} value={`− ${money(d.amount)}`} />
              ))}
              {dbg?.coupon?.code && <Row label={`↳ promo ${dbg.coupon.code}`} value={`− ${money(dbg.coupon.discount)}`} />}
              <Row label="Discount total" value={`− ${money(snap.discount)}`} />
              <Row label={`Tax (${(snap.tax_rate * 100).toFixed(0)}%, ${dbg?.taxMode ?? "exclusive"})`} value={money(snap.tax_amount)} />
              <Row label="Per-vehicle total" value={money(snap.per_vehicle_total)} />
              <Row label="Vehicle count" value={String(snap.vehicle_count)} />
              <Row label="Final total" value={money(snap.final_total)} bold />

              {dbg?.coupon?.reason && (
                <p className="text-xs text-destructive pt-1">Promo code rejected: {dbg.coupon.reason}</p>
              )}
              {dbg?.availability?.available === false && (
                <p className="text-xs text-destructive pt-1">Availability block: {dbg.availability.adminReason ?? "matching restriction rule"}</p>
              )}
              {(dbg?.conflicts?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1">
                  <p className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-3.5" /> Rule conflicts needing review
                  </p>
                  {dbg!.conflicts.map((c: any, i: number) => <p key={i}>{c.label ?? c.name ?? c.id}</p>)}
                </div>
              )}

              {(dbg?.appliedRules?.length ?? 0) > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Applied rules</p>
                  <ul className="text-xs space-y-1">
                    {dbg!.appliedRules.map((a: any, i: number) => (
                      <li key={i} className="rounded bg-muted px-2 py-1">{a.stage ?? a.type ?? "rule"} · {a.name ?? a.id}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(dbg?.unmatchedReasons?.length ?? 0) > 0 && (
                <details className="text-xs pt-1">
                  <summary className="cursor-pointer text-muted-foreground">Why other rules didn't match ({dbg!.unmatchedReasons.length})</summary>
                  <ul className="mt-2 space-y-1 list-disc pl-4">
                    {dbg!.unmatchedReasons.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </details>
              )}

              <div className="pt-3 space-y-2">
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Raw snapshot JSON</summary>
                  <pre className="mt-2 p-3 rounded bg-muted overflow-auto max-h-64">{JSON.stringify(snap, null, 2)}</pre>
                </details>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Rule debug JSON</summary>
                  <pre className="mt-2 p-3 rounded bg-muted overflow-auto max-h-64">{JSON.stringify(dbg, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "ok" | "danger" }) {
  const tones = {
    muted: "border-border text-muted-foreground",
    ok: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
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
