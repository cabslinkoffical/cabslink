import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export type Tier = { tier_name: string; miles: number; cost_per_mile: number; sort_order: number };

export type PricingForm = {
  id: string | null;
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

export const emptyPricing: PricingForm = {
  id: null,
  base_price: 35,
  via_price: 10,
  vehicle_add_price_enabled: false,
  time_extra_from: "",
  time_extra_to: "",
  time_extra_amount: 0,
  time_extra_type: "fixed",
  status: true,
  tiers: [
    { tier_name: "Next 10 miles", miles: 10, cost_per_mile: 2.5, sort_order: 1 },
    { tier_name: "Next 20 miles", miles: 20, cost_per_mile: 2.2, sort_order: 2 },
  ],
};

export function MileageEditor({ pricing, setPricing }: { pricing: PricingForm; setPricing: (p: PricingForm) => void }) {
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
        <Label className="text-sm font-semibold">Minimum price (£)</Label>
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
          const rangeLabel = isLast ? `${prevSum}+ mi` : `${prevSum}–${prevSum + (Number(t.miles) || 0)} mi`;
          return (
            <div key={i} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-2 flex items-center gap-1">
                <div className="flex flex-col -ml-0.5">
                  <button aria-label="Move up" type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="size-3" /></button>
                  <button aria-label="Move down" type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="size-3" /></button>
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
                <Button aria-label="Delete tier" type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive"
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

export function ExtrasEditor({ pricing, setPricing }: { pricing: PricingForm; setPricing: (p: PricingForm) => void }) {
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
          <Label>Mileage pricing active</Label>
        </div>
      </div>

      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={pricing.vehicle_add_price_enabled}
            onCheckedChange={v => setPricing({ ...pricing, vehicle_add_price_enabled: v })} />
          <Label className="font-semibold">Night / peak time extra charge</Label>
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

export function HeroImageUploader({ slug, onUploaded }: { slug: string; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `classes/${slug || "class"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("vehicle-images")
        .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data, error } = await supabase.storage
        .from("vehicle-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error("Failed to sign URL");
      onUploaded(data.signedUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        <span className="ml-1.5">Upload</span>
      </Button>
    </>
  );
}
