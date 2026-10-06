import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getChargeSettings, updateChargeSettings } from "@/lib/extras.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/admin/scheme/GeoEditorLayout";

type Form = {
  tax_enabled: boolean;
  tax_label: string;
  tax_percentage: number;
  policy_non_refundable_percent: number;
  policy_non_refundable_min_pence: number;
  policy_flexible_percent: number;
  policy_flexible_min_pence: number;
};

/** VAT and cancellation cover, managed next to the add-ons they apply to. */
export function ChargeSettingsCard() {
  const qc = useQueryClient();
  const load = useServerFn(getChargeSettings);
  const save = useServerFn(updateChargeSettings);
  const q = useQuery({ queryKey: ["admin", "charge-settings"], queryFn: () => load() });
  const [f, setF] = useState<Form | null>(null);
  useEffect(() => {
    if (q.data) {
      setF({
        tax_enabled: !!q.data.tax_enabled,
        tax_label: q.data.tax_label || "VAT",
        tax_percentage: Number(q.data.tax_percentage ?? 0),
        policy_non_refundable_percent: Number(q.data.policy_non_refundable_percent ?? 5),
        policy_non_refundable_min_pence: Number(q.data.policy_non_refundable_min_pence ?? 200),
        policy_flexible_percent: Number(q.data.policy_flexible_percent ?? 12),
        policy_flexible_min_pence: Number(q.data.policy_flexible_min_pence ?? 400),
      });
    }
  }, [q.data]);
  const m = useMutation({
    mutationFn: (v: Form) => save({ data: v }),
    onSuccess: () => {
      toast.success("VAT and cancellation cover saved");
      void qc.invalidateQueries({ queryKey: ["admin", "charge-settings"] });
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
  if (!f) return null;
  const num = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) || 0 });

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="font-display text-lg font-semibold">VAT</h2>
        <p className="text-xs text-muted-foreground">Applied to the fare and every extra above.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 self-end rounded-lg border border-border px-4 py-2.5">
            <Switch checked={f.tax_enabled} onCheckedChange={(v) => setF({ ...f, tax_enabled: v })} />
            <span className="text-sm">Charge {f.tax_label || "VAT"}</span>
          </div>
          <Field label="Label"><Input maxLength={40} value={f.tax_label} onChange={(e) => setF({ ...f, tax_label: e.target.value })} /></Field>
          <Field label="Rate %"><Input type="number" step="0.01" min="0" max="100" value={f.tax_percentage} onChange={num("tax_percentage")} /></Field>
        </div>
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold">Cancellation cover</h2>
        <p className="text-xs text-muted-foreground">Percent of the ride subtotal (including extras), with a minimum in pence.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <Field label="Non-refundable discount %"><Input type="number" step="0.5" min="0" max="100" value={f.policy_non_refundable_percent} onChange={num("policy_non_refundable_percent")} /></Field>
          <Field label="Non-refundable min (p)"><Input type="number" min="0" value={f.policy_non_refundable_min_pence} onChange={num("policy_non_refundable_min_pence")} /></Field>
          <Field label="Flexible surcharge %"><Input type="number" step="0.5" min="0" max="100" value={f.policy_flexible_percent} onChange={num("policy_flexible_percent")} /></Field>
          <Field label="Flexible min (p)"><Input type="number" min="0" value={f.policy_flexible_min_pence} onChange={num("policy_flexible_min_pence")} /></Field>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => m.mutate(f)} disabled={m.isPending}>Save VAT &amp; cover</Button>
      </div>
    </section>
  );
}
