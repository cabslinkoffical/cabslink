import { useMemo, useState } from "react";
import { BulkTools, BulkActionBar } from "@/components/admin/BulkTools";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { AdminMapEditor } from "@/components/admin/AdminMapEditor";
import { Field, GeoEditorLayout } from "./GeoEditorLayout";
import { deleteSchemeDiscount, upsertSchemeDiscount } from "@/lib/pricing-schemes.functions";

type Draft = {
  id?: string;
  name: string;
  place: SelectedPlace | null;
  radius: number;
  value: number;
  priority: number;
  stackable: boolean;
  notes: string;
  active: boolean;
};

const empty: Draft = { name: "", place: null, radius: 5, value: 10, priority: 100, stackable: false, notes: "", active: true };

export function SchemeDiscountsTab({ classId, discounts }: { classId: string; discounts: any[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(empty);
  const upsert = useServerFn(upsertSchemeDiscount);
  const remove = useServerFn(deleteSchemeDiscount);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "pricing-scheme", classId] }),
    qc.invalidateQueries({ queryKey: ["admin", "pricing-schemes"] }),
    qc.invalidateQueries({ queryKey: ["quotes"] }),
  ]);

  const save = useMutation({
    mutationFn: () => {
      if (!draft.place) throw new Error("Choose the location the discount is centred on.");
      if (!(draft.value > 0)) throw new Error("Enter a discount percentage above zero.");
      return upsert({
        data: {
          id: draft.id,
          classId,
          name: draft.name.trim() || `${draft.value}% around ${draft.place.label}`,
          place_id: draft.place.placeId,
          place_label: draft.place.label,
          radius_miles: draft.radius,
          value: draft.value,
          priority: draft.priority,
          stackable: draft.stackable,
          notes: draft.notes || null,
          active: draft.active,
        } as any,
      });
    },
    onSuccess: async () => { await invalidate(); setDraft(empty); toast.success("Discount saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the discount"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => { await invalidate(); setDraft(empty); toast.success("Discount deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the discount"),
  });

  return (
    <div className="space-y-6">
      <GeoEditorLayout
        title={draft.id ? "Edit discount" : "Add discount"}
        description="Percentage off journeys that start inside the circle. Sized against the pre-tax subtotal by the same engine that prices public quotes."
        fields={
          <>
            <Field label="Discount name">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Glasgow city centre 10%" />
            </Field>
            <Field label="Centred on">
              <PlaceAutocomplete value={draft.place} onChange={(p) => set("place", p)} placeholder="Town, city or postcode" hideAttribution />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Radius (miles)">
                <Input type="number" step="0.1" min="0.1" value={draft.radius} onChange={(e) => set("radius", Number(e.target.value || 0))} />
              </Field>
              <Field label="Discount (%)">
                <Input type="number" step="0.1" min="0" max="100" value={draft.value} onChange={(e) => set("value", Number(e.target.value || 0))} />
              </Field>
            </div>
            <Field label="Priority" hint="Higher wins when discounts are not stackable.">
              <Input type="number" min="0" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value || 0))} />
            </Field>
            <Field label="Notes">
              <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal note (optional)" />
            </Field>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Switch checked={draft.stackable} onCheckedChange={(v) => set("stackable", v)} />
                <span className="text-sm">Can stack with other discounts</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />
                <span className="text-sm">Active</span>
              </div>
            </div>
          </>
        }
        map={
          <AdminMapEditor
            mode="radius"
            origin={draft.place}
            radiusMiles={draft.radius}
            onClearOrigin={() => set("place", null)}
            height={430}
          />
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
              {draft.id ? "Save discount" : "Add discount"}
            </Button>
            {draft.id && (
              <>
                <Button variant="outline" onClick={() => setDraft(empty)}>Cancel</Button>
                <Button variant="destructive" onClick={() => del.mutate(draft.id!)} disabled={del.isPending}>
                  <Trash2 className="mr-1.5 size-4" />Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-semibold">Discounts in this scheme</h3>
          <BulkTools entity="discount_rules" label="Bulk CSV" onChanged={invalidate} />
        </div>
        {discounts.length > 0 && (
          <div className="space-y-2 border-b border-border px-5 py-3">
            <label className="flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground">
              <Checkbox checked={sel.allSelected} onCheckedChange={() => sel.toggleAll()} />
              Select all {discounts.length}
            </label>
            <BulkActionBar entity="discount_rules" ids={sel.ids} onClear={sel.clear} onChanged={invalidate} />
          </div>
        )}
        {discounts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No discounts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {discounts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Checkbox checked={sel.isSelected(String(d.id))} onCheckedChange={() => sel.toggle(String(d.id))} aria-label="Select discount" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraft({
                    id: d.id,
                    name: d.name ?? "",
                    place: d.place_id ? { placeId: d.place_id, label: d.place_label ?? d.name } : null,
                    radius: Number(d.radius_miles ?? 5),
                    value: Number(d.value ?? 0),
                    priority: Number(d.priority ?? 100),
                    stackable: !!d.stackable,
                    notes: d.notes ?? "",
                    active: !!d.active,
                  })}
                >
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {Number(d.value)}% · {Number(d.radius_miles ?? 0)} mi around {d.place_label ?? "—"} · priority {Number(d.priority ?? 100)}
                  </p>
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {d.active ? "Active" : "Paused"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
