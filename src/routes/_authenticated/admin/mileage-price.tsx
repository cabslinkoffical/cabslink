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
            {/* Vehicle selector */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vehicle / Fleet Class</Label>
                  <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                    <SelectTrigger className="h-11 mt-1.5">
                      <SelectValue placeholder="Select a vehicle to edit its pricing…" />
                    </SelectTrigger>
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
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={form.status} onCheckedChange={(v) => setForm({ ...form, status: v })} />
                    <Label className="cursor-pointer text-sm">Active</Label>
                  </div>
                )}
              </div>
            </Card>

            {form.vehicle_id && (
              <Card>
                {/* Header bar */}
                <div className="-mx-5 -mt-5 px-5 py-3 border-b border-border bg-[var(--surface)]/60 rounded-t-xl">
                  <h2 className="text-sm font-bold">Mileage Price</h2>
                </div>

                {/* Minimum Price */}
                <div>
                  <Label className="text-sm font-semibold">Minimum Price</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                    <Input
                      type="number"
                      step={0.01}
                      value={form.base_price}
                      onChange={(e) => setForm({ ...form, base_price: Number(e.target.value || 0) })}
                      className="pl-7 h-11"
                    />
                  </div>
                </div>

                {/* Tier table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 px-1 text-sm font-bold text-foreground">
                    <div className="col-span-2"></div>
                    <div className="col-span-5 text-center">Mileage</div>
                    <div className="col-span-5 text-center">Cost Per mile (£)</div>
                  </div>

                  {form.tiers.map((t, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-2 flex items-center gap-1">
                        <span className="text-sm font-semibold text-foreground/80">Next</span>
                        <div className="flex flex-col -ml-0.5">
                          <button
                            type="button"
                            aria-label="Move up"
                            onClick={() => {
                              const tiers = [...form.tiers];
                              const j = i - 1;
                              if (j < 0) return;
                              [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
                              tiers.forEach((x, k) => (x.sort_order = k + 1));
                              setForm({ ...form, tiers });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp className="size-3" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            onClick={() => {
                              const tiers = [...form.tiers];
                              const j = i + 1;
                              if (j >= tiers.length) return;
                              [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
                              tiers.forEach((x, k) => (x.sort_order = k + 1));
                              setForm({ ...form, tiers });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown className="size-3" />
                          </button>
                        </div>
                      </div>

                      <div className="col-span-5">
                        <div className="flex border border-border rounded-md overflow-hidden bg-background">
                          <Input
                            type="number"
                            step={0.01}
                            value={t.miles}
                            onChange={(e) => {
                              const tiers = [...form.tiers];
                              const miles = Number(e.target.value || 0);
                              tiers[i] = { ...t, miles, tier_name: `Next ${miles} miles` };
                              setForm({ ...form, tiers });
                            }}
                            className="border-0 rounded-none h-11 focus-visible:ring-0"
                          />
                          <span className="flex items-center px-3 bg-[var(--surface)] text-sm text-muted-foreground border-l border-border">
                            miles
                          </span>
                        </div>
                      </div>

                      <div className="col-span-4">
                        <div className="flex border border-border rounded-md overflow-hidden bg-background">
                          <span className="flex items-center px-3 bg-[var(--surface)] text-sm text-muted-foreground border-r border-border">
                            £
                          </span>
                          <Input
                            type="number"
                            step={0.0001}
                            value={t.cost_per_mile}
                            onChange={(e) => {
                              const tiers = [...form.tiers];
                              tiers[i] = { ...t, cost_per_mile: Number(e.target.value || 0) };
                              setForm({ ...form, tiers });
                            }}
                            className="border-0 rounded-none h-11 focus-visible:ring-0"
                          />
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const tiers = form.tiers.filter((_, k) => k !== i);
                            tiers.forEach((x, k) => (x.sort_order = k + 1));
                            setForm({ ...form, tiers });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 mt-2"
                    onClick={() =>
                      setForm({
                        ...form,
                        tiers: [
                          ...form.tiers,
                          {
                            tier_name: "Next 10 miles",
                            miles: 10,
                            cost_per_mile: 2,
                            sort_order: form.tiers.length + 1,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="size-3.5" /> Add mileage tier
                  </Button>
                </div>

                {/* Via Prices row */}
                <div className="grid grid-cols-12 gap-3 items-center pt-4 border-t border-border">
                  <Label className="col-span-3 text-sm font-bold">Via Prices:</Label>
                  <Label className="col-span-4 text-sm font-bold text-right">Cost Per mile (£):</Label>
                  <div className="col-span-5">
                    <div className="flex border border-border rounded-md overflow-hidden bg-background">
                      <span className="flex items-center px-3 bg-[var(--surface)] text-sm text-muted-foreground border-r border-border">
                        £
                      </span>
                      <Input
                        type="number"
                        step={0.01}
                        value={form.via_price}
                        onChange={(e) => setForm({ ...form, via_price: Number(e.target.value || 0) })}
                        className="border-0 rounded-none h-11 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Add Price row */}
                <div className="grid grid-cols-12 gap-3 items-end pt-4 border-t border-border">
                  <div className="col-span-3">
                    <Label className="block text-sm font-bold mb-2">Vehicle Add Price</Label>
                    <input
                      type="checkbox"
                      checked={form.vehicle_add_price_enabled}
                      onChange={(e) => setForm({ ...form, vehicle_add_price_enabled: e.target.checked })}
                      className="size-5 accent-[var(--gold)] cursor-pointer"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">From Time</Label>
                    <Input
                      type="time"
                      value={form.time_extra_from}
                      onChange={(e) => setForm({ ...form, time_extra_from: e.target.value })}
                      className="h-11 mt-1"
                      disabled={!form.vehicle_add_price_enabled}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">To Time</Label>
                    <Input
                      type="time"
                      value={form.time_extra_to}
                      onChange={(e) => setForm({ ...form, time_extra_to: e.target.value })}
                      className="h-11 mt-1"
                      disabled={!form.vehicle_add_price_enabled}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <Input
                      type="number"
                      step={0.01}
                      value={form.time_extra_amount}
                      onChange={(e) => setForm({ ...form, time_extra_amount: Number(e.target.value || 0) })}
                      className="h-11 mt-1"
                      disabled={!form.vehicle_add_price_enabled}
                    />
                  </div>
                  <div className="col-span-3 flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 h-11 mt-1 border rounded-md cursor-pointer transition ${form.time_extra_type === "fixed" ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}>
                      <input
                        type="radio"
                        name="extra_type"
                        checked={form.time_extra_type === "fixed"}
                        onChange={() => setForm({ ...form, time_extra_type: "fixed" })}
                        className="accent-[var(--gold)]"
                        disabled={!form.vehicle_add_price_enabled}
                      />
                      <span className="text-sm font-semibold">£</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 h-11 mt-1 border rounded-md cursor-pointer transition ${form.time_extra_type === "percent" ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}>
                      <input
                        type="radio"
                        name="extra_type"
                        checked={form.time_extra_type === "percent"}
                        onChange={() => setForm({ ...form, time_extra_type: "percent" })}
                        className="accent-[var(--gold)]"
                        disabled={!form.vehicle_add_price_enabled}
                      />
                      <span className="text-sm font-semibold">%</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={() => save.mutate(form)}
                    disabled={save.isPending}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="size-4" /> {save.isPending ? "Saving…" : "Submit"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...EMPTY, vehicle_id: form.vehicle_id })}
                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <RotateCcw className="size-4" /> Reset
                  </Button>

                  {form.id && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Select value={duplicateTarget} onValueChange={setDuplicateTarget}>
                        <SelectTrigger className="w-[220px] h-10">
                          <SelectValue placeholder="Copy to vehicle…" />
                        </SelectTrigger>
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
              </Card>
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
