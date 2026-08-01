import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehiclesAdmin } from "@/lib/admin.functions";
import { listVehicleClassesAdmin } from "@/lib/vehicle-classes.functions";
import { adminListPricingProfiles, adminSavePricingProfile, adminDuplicatePricingProfile } from "@/lib/pricing.functions";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Gauge, Settings2, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
const cOpts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });


export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/mileage-pricing")({
  head: () => ({
    meta: [
      { title: "Mileage Pricing — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: mileage pricing." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(vOpts),
    context.queryClient.ensureQueryData(cOpts),
  ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

type Tier = { tier_name: string; miles: number; cost_per_mile: number; sort_order: number };

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
    { tier_name: "Next 10 miles", miles: 10, cost_per_mile: 2.5, sort_order: 1 },
    { tier_name: "Next 20 miles", miles: 20, cost_per_mile: 2.2, sort_order: 2 },
  ] as Tier[],
};

function Page() {
  const { data: vehicles } = useSuspenseQuery(vOpts);
  const { data: classData } = useSuspenseQuery(cOpts);
  const classes: any[] = classData.classes ?? [];
  const qc = useQueryClient();
  const listPricingFn = useServerFn(adminListPricingProfiles);
  const saveFn = useServerFn(adminSavePricingProfile);

  const pricingQ = useQuery({ queryKey: ["pricing-profiles"], queryFn: () => listPricingFn() });
  const profiles: any[] = pricingQ.data?.profiles ?? [];


  const [activeVehicle, setActiveVehicle] = useState<any>(null);
  const [pricing, setPricing] = useState<typeof emptyPricing>(emptyPricing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeVehicle) return;
    const existing = profiles.find((p) => p.vehicle_id === activeVehicle.id);
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
    } else {
      setPricing(emptyPricing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVehicle?.id, pricingQ.data]);

  async function save() {
    if (!activeVehicle) return;
    if (!pricing.tiers.length) { toast.error("Add at least one mileage tier"); return; }
    setSaving(true);
    try {
      await saveFn({
        data: {
          id: pricing.id,
          vehicle_id: activeVehicle.id,
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
      qc.invalidateQueries({ queryKey: ["pricing-profiles"] });
      toast.success("Mileage pricing saved");
      setActiveVehicle(null);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Mileage Pricing" description="Per-class tiered mileage rates and time-based extras. Every vehicle in the class inherits this pricing." />

      {classes.length === 0 ? (
        <EmptyState title="No vehicle classes" hint="Add a class first under Fleet → Vehicle Classes." />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Vehicle Class</th>
                <th className="text-right px-4 py-3">Minimum price</th>
                <th className="text-center px-4 py-3">Tiers</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.map((c: any) => {
                const v = vehicles.find((x: any) => x.id === c.pricing_vehicle_id) ?? null;
                const p = v ? profiles.find((x) => x.vehicle_id === v.id) : null;
                const notLinked = !v;
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.hero_image && <img src={c.hero_image} alt="" className="size-10 object-cover rounded-md bg-muted" />}
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.passengers} pax · {c.large_luggage + c.cabin_bags} bags</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{p ? `£${Number(p.base_price).toFixed(2)}` : <span className="text-muted-foreground font-normal">—</span>}</td>
                    <td className="px-4 py-3 text-center">{p?.tiers?.length ?? 0}</td>
                    <td className="px-4 py-3">{p ? <StatusBadge status={p.status ? "active" : "inactive"} /> : <span className="text-xs text-muted-foreground">Not set</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {v && (
                          <DuplicateButton
                            vehicleId={v.id}
                            vehicleName={c.name}
                            profiles={profiles}
                            onDone={() => qc.invalidateQueries({ queryKey: ["pricing-profiles"] })}
                          />
                        )}
                        <Button size="sm" variant={p ? "outline" : "default"} disabled={notLinked} title={notLinked ? "This class is quote-on-request only" : ""} onClick={() => setActiveVehicle({ ...v, name: c.name })}>
                          {p ? "Edit pricing" : "Set pricing"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}



      <Dialog open={!!activeVehicle} onOpenChange={(o) => !o && setActiveVehicle(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mileage pricing — {activeVehicle?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Gauge className="size-3.5" /> Tiered rates</h3>
              <MileageEditor pricing={pricing} setPricing={setPricing} />
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Settings2 className="size-3.5" /> Extras</h3>
              <ExtrasEditor pricing={pricing} setPricing={setPricing} />
            </section>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
            <Button variant="outline" onClick={() => setActiveVehicle(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Saving…</> : "Save pricing"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MileageEditor({ pricing, setPricing }: { pricing: typeof emptyPricing; setPricing: (p: typeof emptyPricing) => void }) {
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
        <div className="relative mt-1.5 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
          <Input type="number" step={0.01} value={pricing.base_price}
            onChange={e => setPricing({ ...pricing, base_price: Number(e.target.value || 0) })} className="pl-7 h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-3 px-1 text-xs uppercase tracking-wider font-bold text-muted-foreground">
          <div className="col-span-2" />
          <div className="col-span-5 text-center">Mileage</div>
          <div className="col-span-4 text-center">Cost per mile (£)</div>
          <div className="col-span-1" />
        </div>

        {pricing.tiers.map((t, i) => {
          const prevSum = pricing.tiers.slice(0, i).reduce((s, x) => s + (Number(x.miles) || 0), 0);
          const isLast = i === pricing.tiers.length - 1;
          const rangeLabel = isLast
            ? `${prevSum}+ mi`
            : `${prevSum}–${prevSum + (Number(t.miles) || 0)} mi`;
          return (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-2 flex items-center gap-1">
              <div className="flex flex-col -ml-0.5">
                <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="size-3" /></button>
                <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="size-3" /></button>
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{rangeLabel}</span>
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
              <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                onClick={() => {
                  const tiers = pricing.tiers.filter((_, k) => k !== i);
                  tiers.forEach((x, k) => (x.sort_order = k + 1));
                  setPricing({ ...pricing, tiers });
                }}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          );
        })}

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

function ExtrasEditor({ pricing, setPricing }: { pricing: typeof emptyPricing; setPricing: (p: typeof emptyPricing) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold">Via stop price (£/mile)</Label>
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

function DuplicateButton({
  vehicleId, vehicleName, profiles, onDone,
}: {
  vehicleId: string;
  vehicleName: string;
  profiles: any[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sourceProfileId, setSourceProfileId] = useState<string>("");
  const dupFn = useServerFn(adminDuplicatePricingProfile);
  const candidates = profiles.filter((p) => p.vehicle_id !== vehicleId);
  if (candidates.length === 0) return null;

  return (
    <>
      <Button size="sm" variant="ghost" title="Duplicate pricing from another vehicle" onClick={() => setOpen(true)}>
        <Copy className="size-3.5 mr-1" /> Copy from…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Copy pricing to {vehicleName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source pricing profile</Label>
              <Select value={sourceProfileId} onValueChange={setSourceProfileId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a source profile" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      Vehicle profile · £{Number(p.base_price).toFixed(2)} base · {(p.tiers ?? []).length} tiers
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                disabled={!sourceProfileId}
                onClick={async () => {
                  try {
                    await dupFn({ data: { source_profile_id: sourceProfileId, target_vehicle_id: vehicleId } });
                    toast.success("Pricing duplicated");
                    setOpen(false);
                    onDone();
                  } catch (e: any) {
                    toast.error(e.message ?? "Duplication failed");
                  }
                }}
              >Copy pricing</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
