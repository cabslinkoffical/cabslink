import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, ArrowDown, ArrowUp, Save, RotateCcw, Copy as CopyIcon, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import {
  adminListPricingProfiles,
  adminSavePricingProfile,
  adminDuplicatePricingProfile,
  adminTestQuote,
} from "@/lib/pricing.functions";

export const Route = createFileRoute("/_authenticated/admin/mileage-price")({
  component: MileagePricePage,
});

type Tier = { tier_name: string; miles: number; cost_per_mile: number; sort_order: number };

type FormState = {
  id: string | null;
  vehicle_id: string;
  base_price: number;
  via_price: number;
  vehicle_add_price_enabled: boolean;
  time_extra_from: string;
  time_extra_to: string;
  time_extra_amount: number;
  time_extra_type: "fixed" | "percent";
  status: boolean;
  tiers: Tier[];
};

const EMPTY: FormState = {
  id: null,
  vehicle_id: "",
  base_price: 35,
  via_price: 10,
  vehicle_add_price_enabled: false,
  time_extra_from: "",
  time_extra_to: "",
  time_extra_amount: 0,
  time_extra_type: "fixed",
  status: true,
  tiers: [
    { tier_name: "Next 10 miles", miles: 10, cost_per_mile: 0.01, sort_order: 1 },
    { tier_name: "Next 10 miles", miles: 10, cost_per_mile: 3.5, sort_order: 2 },
    { tier_name: "Next 20 miles", miles: 20, cost_per_mile: 2.2, sort_order: 3 },
    { tier_name: "Next 50 miles", miles: 50, cost_per_mile: 2.3, sort_order: 4 },
    { tier_name: "Next 999 miles", miles: 999, cost_per_mile: 2.4, sort_order: 5 },
  ],
};

function MileagePricePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPricingProfiles);
  const saveFn = useServerFn(adminSavePricingProfile);
  const dupFn = useServerFn(adminDuplicatePricingProfile);
  const testFn = useServerFn(adminTestQuote);

  const { data, isLoading } = useQuery({ queryKey: ["pricing-profiles"], queryFn: () => listFn() });
  const vehicles = data?.vehicles ?? [];
  const profiles = data?.profiles ?? [];

  const [form, setForm] = useState<FormState>(EMPTY);
  const [duplicateTarget, setDuplicateTarget] = useState<string>("");

  // Load profile when vehicle selected
  useEffect(() => {
    if (!form.vehicle_id) return;
    const existing: any = profiles.find((p: any) => p.vehicle_id === form.vehicle_id);
    if (existing) {
      setForm({
        id: existing.id,
        vehicle_id: existing.vehicle_id,
        base_price: Number(existing.base_price),
        via_price: Number(existing.via_price),
        vehicle_add_price_enabled: !!existing.vehicle_add_price_enabled,
        time_extra_from: existing.time_extra_from ?? "",
        time_extra_to: existing.time_extra_to ?? "",
        time_extra_amount: Number(existing.time_extra_amount),
        time_extra_type: existing.time_extra_type,
        status: !!existing.status,
        tiers: (existing.tiers ?? []).map((t: any) => ({
          tier_name: t.tier_name,
          miles: Number(t.miles),
          cost_per_mile: Number(t.cost_per_mile),
          sort_order: t.sort_order,
        })),
      });
    } else {
      setForm({ ...EMPTY, vehicle_id: form.vehicle_id });
    }
  }, [form.vehicle_id, profiles]);

  const save = useMutation({
    mutationFn: (payload: FormState) => saveFn({ data: payload as any }),
    onSuccess: () => {
      toast.success("Pricing profile saved");
      qc.invalidateQueries({ queryKey: ["pricing-profiles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const dup = useMutation({
    mutationFn: (target: string) =>
      dupFn({ data: { source_profile_id: form.id!, target_vehicle_id: target } as any }),
    onSuccess: () => {
      toast.success("Profile duplicated");
      setDuplicateTarget("");
      qc.invalidateQueries({ queryKey: ["pricing-profiles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Duplicate failed"),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Mileage Price"
        description="Build the tiered mileage pricing engine for each vehicle class."
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" hint="Add vehicles in Fleet first." />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div>
                <Label>Vehicle class / fleet</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select a vehicle…" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} — {v.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.vehicle_id && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <NumField
                      label="Minimum / base price (£)"
                      value={form.base_price}
                      step={0.01}
                      onChange={(v) => setForm({ ...form, base_price: v })}
                    />
                    <NumField
                      label="Via stop price (£ per stop)"
                      value={form.via_price}
                      step={0.01}
                      onChange={(v) => setForm({ ...form, via_price: v })}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.vehicle_add_price_enabled}
                      onCheckedChange={(v) => setForm({ ...form, vehicle_add_price_enabled: v })}
                    />
                    <Label className="cursor-pointer">Add vehicle add-price surcharge</Label>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-3">
                    <div>
                      <Label>From time</Label>
                      <Input
                        type="time"
                        value={form.time_extra_from}
                        onChange={(e) => setForm({ ...form, time_extra_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>To time</Label>
                      <Input
                        type="time"
                        value={form.time_extra_to}
                        onChange={(e) => setForm({ ...form, time_extra_to: e.target.value })}
                      />
                    </div>
                    <NumField
                      label="Extra amount"
                      value={form.time_extra_amount}
                      step={0.01}
                      onChange={(v) => setForm({ ...form, time_extra_amount: v })}
                    />
                    <div>
                      <Label>Extra type</Label>
                      <Select
                        value={form.time_extra_type}
                        onValueChange={(v) => setForm({ ...form, time_extra_type: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed £</SelectItem>
                          <SelectItem value="percent">Percent %</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch checked={form.status} onCheckedChange={(v) => setForm({ ...form, status: v })} />
                    <Label className="cursor-pointer">Active (quoted on the website)</Label>
                  </div>
                </>
              )}
            </Card>

            {form.vehicle_id && (
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Mileage tiers</h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        ...form,
                        tiers: [
                          ...form.tiers,
                          {
                            tier_name: `Next ${10} miles`,
                            miles: 10,
                            cost_per_mile: 2,
                            sort_order: form.tiers.length + 1,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="size-3.5" /> Add tier
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
                    <div className="col-span-5">Tier name</div>
                    <div className="col-span-2">Next miles</div>
                    <div className="col-span-2">Cost / mile</div>
                    <div className="col-span-1">Order</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  {form.tiers.map((t, i) => (
                    <TierRow
                      key={i}
                      tier={t}
                      onChange={(next) => {
                        const tiers = [...form.tiers];
                        tiers[i] = next;
                        setForm({ ...form, tiers });
                      }}
                      onMove={(dir) => {
                        const tiers = [...form.tiers];
                        const j = i + dir;
                        if (j < 0 || j >= tiers.length) return;
                        [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
                        tiers.forEach((x, k) => (x.sort_order = k + 1));
                        setForm({ ...form, tiers });
                      }}
                      onRemove={() => {
                        const tiers = form.tiers.filter((_, k) => k !== i);
                        tiers.forEach((x, k) => (x.sort_order = k + 1));
                        setForm({ ...form, tiers });
                      }}
                    />
                  ))}
                </div>
              </Card>
            )}

            {form.vehicle_id && (
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="gap-2">
                  <Save className="size-4" /> {save.isPending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setForm({ ...EMPTY, vehicle_id: form.vehicle_id })} className="gap-2">
                  <RotateCcw className="size-4" /> Reset
                </Button>

                {form.id && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Select value={duplicateTarget} onValueChange={setDuplicateTarget}>
                      <SelectTrigger className="w-[220px]"><SelectValue placeholder="Copy to vehicle…" /></SelectTrigger>
                      <SelectContent>
                        {vehicles
                          .filter((v: any) => v.id !== form.vehicle_id)
                          .map((v: any) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!duplicateTarget || dup.isPending}
                      onClick={() => dup.mutate(duplicateTarget)}
                      className="gap-2"
                    >
                      <CopyIcon className="size-4" /> Duplicate
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test column */}
          <div>
            <TestPanel
              vehicles={vehicles}
              defaultVehicleId={form.vehicle_id}
              testFn={testFn}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 space-y-4">{children}</div>;
}

function NumField({
  label, value, step = 1, onChange,
}: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      />
    </div>
  );
}

function TierRow({
  tier, onChange, onMove, onRemove,
}: {
  tier: Tier;
  onChange: (t: Tier) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center bg-background border border-border rounded-lg p-2">
      <Input
        className="col-span-5"
        value={tier.tier_name}
        onChange={(e) => onChange({ ...tier, tier_name: e.target.value })}
      />
      <Input
        className="col-span-2"
        type="number"
        step={0.01}
        value={tier.miles}
        onChange={(e) => onChange({ ...tier, miles: Number(e.target.value || 0) })}
      />
      <Input
        className="col-span-2"
        type="number"
        step={0.0001}
        value={tier.cost_per_mile}
        onChange={(e) => onChange({ ...tier, cost_per_mile: Number(e.target.value || 0) })}
      />
      <Input
        className="col-span-1"
        type="number"
        step={1}
        value={tier.sort_order}
        onChange={(e) => onChange({ ...tier, sort_order: Number(e.target.value || 0) })}
      />
      <div className="col-span-2 flex justify-end gap-1">
        <Button type="button" size="icon" variant="ghost" onClick={() => onMove(-1)}><ArrowUp className="size-3.5" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => onMove(1)}><ArrowDown className="size-3.5" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={onRemove} className="text-red-600"><Trash2 className="size-3.5" /></Button>
      </div>
    </div>
  );
}

function TestPanel({
  vehicles, defaultVehicleId, testFn,
}: {
  vehicles: any[];
  defaultVehicleId: string;
  testFn: ReturnType<typeof useServerFn<typeof adminTestQuote>>;
}) {
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [distance, setDistance] = useState(42);
  const [pickupTime, setPickupTime] = useState("");
  const [stops, setStops] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (defaultVehicleId && !vehicleId) setVehicleId(defaultVehicleId); }, [defaultVehicleId]);

  const lines = useMemo(() => result?.breakdown ?? [], [result]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 sticky top-20">
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-[var(--gold)]" />
        <h2 className="font-semibold">Test pricing</h2>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Vehicle</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <NumField label="Distance (miles)" value={distance} step={0.1} onChange={setDistance} />
        <div>
          <Label>Pickup time</Label>
          <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
        </div>
        <NumField label="Via stops" value={stops} step={1} onChange={(v) => setStops(Math.max(0, Math.floor(v)))} />
        <Button
          type="button"
          disabled={!vehicleId || loading}
          onClick={async () => {
            try {
              setLoading(true);
              const r = await testFn({
                data: { vehicle_id: vehicleId, distance_miles: distance, pickup_time: pickupTime, via_stops: stops } as any,
              });
              setResult(r);
            } catch (e: any) {
              toast.error(e?.message ?? "Test failed");
            } finally {
              setLoading(false);
            }
          }}
          className="w-full gap-2"
        >
          <Calculator className="size-4" /> {loading ? "Calculating…" : "Calculate"}
        </Button>
      </div>

      {result && (
        <div className="border-t border-border pt-3 space-y-1.5 text-sm">
          {lines.map((l: any, i: number) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {l.label}
                {l.kind === "mileage" && (
                  <span className="text-xs text-muted-foreground/70"> ({l.miles} × £{Number(l.rate).toFixed(2)})</span>
                )}
              </span>
              <span className="tabular-nums font-medium">£{Number(l.amount).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 mt-2 font-bold">
            <span>Final price</span>
            <span className="tabular-nums">£{Number(result.finalPrice).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
