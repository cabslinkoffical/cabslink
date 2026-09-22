import { useMemo, useState } from "react";
import { BulkActionBar } from "@/components/admin/BulkTools";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkTools } from "@/components/admin/BulkTools";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { AdminMapEditor } from "@/components/admin/AdminMapEditor";
import { Field, GeoEditorLayout } from "./GeoEditorLayout";
import { deleteSchemeLocation, upsertSchemeLocation } from "@/lib/pricing-schemes.functions";

type Scope = "pickup" | "dropoff" | "either";

type Draft = {
  id?: string;
  name: string;
  place: SelectedPlace | null;
  radius: number;
  scope: Scope;
  price: number;
  includedMiles: number;
  extraPerMile: number;
  priority: number;
  notes: string;
  active: boolean;
};

const empty: Draft = {
  name: "", place: null, radius: 5, scope: "either", price: 0,
  includedMiles: 0, extraPerMile: 0, priority: 100, notes: "", active: true,
};

export function SchemeLocationsTab({ classId, locations }: { classId: string; locations: any[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(empty);
  const [view, setView] = useViewMode("scheme-locations", "list");
  const upsert = useServerFn(upsertSchemeLocation);
  const remove = useServerFn(deleteSchemeLocation);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "pricing-scheme", classId] }),
    qc.invalidateQueries({ queryKey: ["admin", "pricing-schemes"] }),
    qc.invalidateQueries({ queryKey: ["quotes"] }),
  ]);

  const allIds = useMemo(() => locations.map((l) => String(l.id)), [locations]);
  const sel = useRowSelection(allIds);

  const save = useMutation({
    mutationFn: () => {
      if (!draft.place) throw new Error("Choose the location this zone is centred on.");
      if (!(draft.price > 0)) throw new Error("Enter the zone price.");
      return upsert({
        data: {
          id: draft.id,
          classId,
          name: draft.name.trim() || `Zone around ${draft.place.label}`,
          place_id: draft.place.placeId,
          place_label: draft.place.label,
          radius_miles: draft.radius,
          scope: draft.scope,
          price: draft.price,
          included_distance_miles: draft.includedMiles,
          extra_per_mile: draft.extraPerMile,
          priority: draft.priority,
          notes: draft.notes || null,
          active: draft.active,
        } as any,
      });
    },
    onSuccess: async () => { await invalidate(); setDraft(empty); toast.success("Location rule saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the location rule"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => { await invalidate(); setDraft(empty); toast.success("Location rule deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the location rule"),
  });

  return (
    <div className="space-y-6">
      <GeoEditorLayout
        title={draft.id ? "Edit location pricing" : "Add location pricing"}
        description="Zone pricing for journeys touching the circle. Used when no fixed route matches, before the per-mile bands."
        fields={
          <>
            <Field label="Rule name">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Edinburgh zone" />
            </Field>
            <Field label="Centred on">
              <PlaceAutocomplete value={draft.place} onChange={(p) => set("place", p)} placeholder="Town, city or postcode" hideAttribution />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Radius (miles)">
                <Input type="number" step="0.1" min="0.1" value={draft.radius} onChange={(e) => set("radius", Number(e.target.value || 0))} />
              </Field>
              <Field label="Applies to">
                <Select value={draft.scope} onValueChange={(v) => set("scope", v as Scope)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="either">Pickup or drop-off</SelectItem>
                    <SelectItem value="pickup">Pickup only</SelectItem>
                    <SelectItem value="dropoff">Drop-off only</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zone price (£)">
                <Input type="number" step="0.01" min="0" value={draft.price} onChange={(e) => set("price", Number(e.target.value || 0))} />
              </Field>
              <Field label="Priority" hint="Higher wins.">
                <Input type="number" min="0" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value || 0))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Included distance (miles)">
                <Input type="number" step="0.1" min="0" value={draft.includedMiles} onChange={(e) => set("includedMiles", Number(e.target.value || 0))} />
              </Field>
              <Field label="Extra per mile (£)">
                <Input type="number" step="0.01" min="0" value={draft.extraPerMile} onChange={(e) => set("extraPerMile", Number(e.target.value || 0))} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal note (optional)" />
            </Field>
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />
              <span className="text-sm">Active</span>
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
              {draft.id ? "Save rule" : "Add rule"}
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
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
          <h3 className="font-display text-base font-semibold">Location pricing in this scheme</h3>
                    </div>
          <div className="flex items-center gap-2">
            <ViewToggle mode={view} onChange={setView} />
            <BulkTools entity="location_pricing_rules" label="Bulk CSV" onChanged={invalidate} />
          </div>
</div>
        {locations.length > 0 && (
          <div className="space-y-2 border-b border-border px-5 py-3">
            <label className="flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground">
              <Checkbox checked={sel.allSelected} onCheckedChange={() => sel.toggleAll()} />
              Select all {locations.length}
            </label>
            <BulkActionBar entity="location_pricing_rules" ids={sel.ids} onClear={sel.clear} onChanged={invalidate} />
          </div>
        )}
        {locations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No location rules yet.</p>
        ) : view === "list" ? (
          <ul className="divide-y divide-border">
            {locations.map((l) => {
              const selected = sel.isSelected(String(l.id));
              return (
              <li key={l.id} className={`flex flex-wrap items-center gap-3 border-l-4 px-5 py-3 transition-colors ${selected ? "border-l-primary bg-primary/10" : "border-l-transparent"}`}>
                <Checkbox checked={sel.isSelected(String(l.id))} onCheckedChange={() => sel.toggle(String(l.id))} aria-label="Select location rule" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraft({
                    id: l.id,
                    name: l.name ?? "",
                    place: l.place_id ? { placeId: l.place_id, label: l.place_label ?? l.name } : null,
                    radius: Number(l.radius_miles ?? 5),
                    scope: (l.scope ?? "either") as Scope,
                    price: Number(l.price ?? 0),
                    includedMiles: Number(l.included_distance_miles ?? 0),
                    extraPerMile: Number(l.extra_per_mile ?? 0),
                    priority: Number(l.priority ?? 100),
                    notes: l.notes ?? "",
                    active: !!l.active,
                  })}
                >
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    £{Number(l.price).toFixed(2)} · {Number(l.radius_miles ?? 0)} mi · {l.scope} · priority {Number(l.priority ?? 100)}
                  </p>
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {l.active ? "Active" : "Paused"}
                </span>
                {selected && <span className="text-xs font-semibold text-primary">Selected</span>}
              </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {locations.map((l) => {
              const selected = sel.isSelected(String(l.id));
              return (
              <div
                key={l.id}
                className={`relative rounded-xl border bg-background transition ${selected ? "border-primary bg-primary/10 ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}
              >
                <span className="absolute right-3 top-3 z-10">
                  <Checkbox checked={selected} onCheckedChange={() => sel.toggle(String(l.id))} aria-label="Select location rule" />
                </span>
              <button
                onClick={() => setDraft({
                  id: l.id,
                  name: l.name ?? "",
                  place: l.place_id ? { placeId: l.place_id, label: l.place_label ?? l.name } : null,
                  radius: Number(l.radius_miles ?? 5),
                  scope: (l.scope ?? "either") as Scope,
                  price: Number(l.price ?? 0),
                  includedMiles: Number(l.included_distance_miles ?? 0),
                  extraPerMile: Number(l.extra_per_mile ?? 0),
                  priority: Number(l.priority ?? 100),
                  notes: l.notes ?? "",
                  active: !!l.active,
                })}
                className="block w-full p-4 pr-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {l.active ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="mt-2 font-display text-xl font-semibold tabular-nums">£{Number(l.price).toFixed(2)}</p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {Number(l.radius_miles ?? 0)} mi · {l.scope} · priority {Number(l.priority ?? 100)}
                </p>
              </button>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
