import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkTools, BulkActionBar } from "@/components/admin/BulkTools";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { Checkbox } from "@/components/ui/checkbox";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { AdminMapEditor } from "@/components/admin/AdminMapEditor";
import { Field, GeoEditorLayout } from "./GeoEditorLayout";
import {
  deleteSchemeRoute,
  previewRouteConflicts,
  upsertSchemeRoute,
} from "@/lib/pricing-schemes.functions";

type RouteRow = any;

type Draft = {
  id?: string;
  from: SelectedPlace | null;
  fromRadius: number;
  to: SelectedPlace | null;
  toRadius: number;
  price: number;
  validForReturn: boolean;
  priority: number;
  notes: string;
  active: boolean;
};

const emptyDraft: Draft = {
  from: null, fromRadius: 0, to: null, toRadius: 0, price: 0,
  validForReturn: true, priority: 100, notes: "", active: true,
};

function rowToDraft(r: RouteRow): Draft {
  return {
    id: r.id,
    from: r.from_place_id ? { placeId: r.from_place_id, label: r.from_place_label ?? r.from_address } : null,
    fromRadius: Number(r.from_radius_miles ?? 0),
    to: r.to_place_id ? { placeId: r.to_place_id, label: r.to_place_label ?? r.to_address } : null,
    toRadius: Number(r.to_radius_miles ?? 0),
    price: Number(r.price ?? 0),
    validForReturn: (r.bidirectional ?? r.valid_for_return) !== false,
    priority: Number(r.priority ?? 100),
    notes: r.notes ?? "",
    active: !!r.active,
  };
}

export function SchemeRoutesTab({ classId, routes }: { classId: string; routes: RouteRow[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [liveRoute, setLiveRoute] = useState<{ miles: number; minutes: number } | null>(null);
  type Coord = { lat: number; lng: number } | null;
  const [coords, setCoords] = useState<{ origin: Coord; destination: Coord }>({ origin: null, destination: null });
  const [view, setView] = useViewMode("scheme-routes", "list");

  const upsert = useServerFn(upsertSchemeRoute);
  const remove = useServerFn(deleteSchemeRoute);
  const conflictsFn = useServerFn(previewRouteConflicts);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const canCheck = !!draft.from && !!draft.to && draft.from.placeId !== draft.to.placeId;

  const conflicts = useQuery({
    queryKey: ["admin", "scheme-route-conflicts", classId, draft.from?.placeId, draft.to?.placeId,
      draft.fromRadius, draft.toRadius, draft.price, draft.priority, draft.validForReturn, draft.id ?? null],
    enabled: canCheck,
    staleTime: 30_000,
    queryFn: () => conflictsFn({
      data: {
        classId,
        excludeId: draft.id,
        from_place_id: draft.from!.placeId,
        to_place_id: draft.to!.placeId,
        from_radius_miles: draft.fromRadius,
        to_radius_miles: draft.toRadius,
        price: draft.price,
        priority: draft.priority,
        bidirectional: draft.validForReturn,
      } as any,
    }),
  });

  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "pricing-scheme", classId] }),
    qc.invalidateQueries({ queryKey: ["admin", "pricing-schemes"] }),
    qc.invalidateQueries({ queryKey: ["quotes"] }),
  ]);

  const save = useMutation({
    mutationFn: () => {
      if (!draft.from || !draft.to) throw new Error("Choose both a start and an end location.");
      if (!(draft.price > 0)) throw new Error("Enter the fixed price for this route.");
      return upsert({
        data: {
          id: draft.id,
          classId,
          from_place_id: draft.from.placeId,
          from_place_label: draft.from.label,
          from_radius_miles: draft.fromRadius,
          to_place_id: draft.to.placeId,
          to_place_label: draft.to.label,
          to_radius_miles: draft.toRadius,
          price: draft.price,
          bidirectional: draft.validForReturn,
          priority: draft.priority,
          notes: draft.notes || null,
          active: draft.active,
        } as any,
      });
    },
    onSuccess: async () => {
      await invalidate();
      setDraft(emptyDraft);
      toast.success("Route saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the route"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => { await invalidate(); setDraft(emptyDraft); toast.success("Route deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the route"),
  });

  const winner = conflicts.data?.winner as any;
  const overlapping = (conflicts.data?.overlapping ?? []) as any[];
  const beaten = winner && !winner.isCandidate;

  const sorted = useMemo(
    () => [...routes].sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0)),
    [routes],
  );
  const allIds = useMemo(() => sorted.map((r) => String(r.id)), [sorted]);
  const sel = useRowSelection(allIds);

  return (
    <div className="space-y-6">
      <GeoEditorLayout
        title={draft.id ? "Edit fixed route" : "Add fixed route"}
        description="Pick the start and end on the map. Markers, the live route and the radius circles update as you type."
        fields={
          <>
            <Field label="Start location">
              <PlaceAutocomplete value={draft.from} onChange={(p) => set("from", p)} placeholder="Pickup area or address" hideAttribution />
            </Field>
            <Field label="Start radius (miles)" hint="0 matches the exact place only.">
              <Input type="number" step="0.1" min="0" value={draft.fromRadius} onChange={(e) => set("fromRadius", Number(e.target.value || 0))} />
            </Field>
            <Field label="End location">
              <PlaceAutocomplete value={draft.to} onChange={(p) => set("to", p)} placeholder="Destination area or address" hideAttribution />
            </Field>
            <Field label="End radius (miles)">
              <Input type="number" step="0.1" min="0" value={draft.toRadius} onChange={(e) => set("toRadius", Number(e.target.value || 0))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fixed price (£)">
                <Input type="number" step="0.01" min="0" value={draft.price} onChange={(e) => set("price", Number(e.target.value || 0))} />
              </Field>
              <Field label="Priority" hint="Higher wins.">
                <Input type="number" min="0" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value || 0))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start coordinates" hint="Filled automatically from the chosen place.">
                <Input readOnly className="bg-muted/50 tabular-nums"
                  value={coords.origin ? `${coords.origin.lat.toFixed(6)}, ${coords.origin.lng.toFixed(6)}` : "—"} />
              </Field>
              <Field label="End coordinates" hint="Filled automatically from the chosen place.">
                <Input readOnly className="bg-muted/50 tabular-nums"
                  value={coords.destination ? `${coords.destination.lat.toFixed(6)}, ${coords.destination.lng.toFixed(6)}` : "—"} />
              </Field>
            </div>
            <Field label="Live route (read only)">
              <Input readOnly className="bg-muted/50 tabular-nums"
                value={liveRoute ? `${liveRoute.miles.toFixed(1)} mi · ${Math.round(liveRoute.minutes)} min` : "—"} />
            </Field>
            <Field label="Notes">
              <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal note (optional)" />
            </Field>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Switch checked={draft.validForReturn} onCheckedChange={(v) => set("validForReturn", v)} />
                <span className="text-sm">Also valid for the return journey</span>
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
            mode="route"
            origin={draft.from}
            destination={draft.to}
            radiusMiles={draft.fromRadius}
            destinationRadiusMiles={draft.toRadius}
            onClearOrigin={() => set("from", null)}
            onClearDestination={() => set("to", null)}
            onReverse={() => setDraft((d) => ({ ...d, from: d.to, to: d.from, fromRadius: d.toRadius, toRadius: d.fromRadius }))}
            onRoute={setLiveRoute}
            height={430}
          />
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
              {draft.id ? "Save route" : "Add route"}
            </Button>
            {draft.id && (
              <>
                <Button variant="outline" onClick={() => setDraft(emptyDraft)}>Cancel</Button>
                <Button variant="destructive" onClick={() => del.mutate(draft.id!)} disabled={del.isPending}>
                  <Trash2 className="mr-1.5 size-4" />Delete
                </Button>
              </>
            )}
            <div className="flex-1" />
            {canCheck && overlapping.length > 0 && (
              <p className={`flex items-center gap-1.5 text-xs ${beaten ? "text-destructive" : "text-muted-foreground"}`}>
                <TriangleAlert className="size-3.5" />
                {beaten
                  ? `Another rule wins this pair: ${winner.label} (£${Number(winner.price).toFixed(2)})`
                  : `${overlapping.length} other rule${overlapping.length > 1 ? "s" : ""} also match, this one wins`}
              </p>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
          <h3 className="font-display text-base font-semibold">Fixed routes in this scheme</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Fixed routes beat location pricing and per-mile bands.</p>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle mode={view} onChange={setView} />
            <BulkTools entity="pricing_rules" label="Bulk CSV" onChanged={invalidate} />
          </div>
        </div>
        {sorted.length > 0 && (
          <div className="space-y-2 border-b border-border px-5 py-3">
            <label className="flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground">
              <Checkbox checked={sel.allSelected} onCheckedChange={() => sel.toggleAll()} />
              Select all {sorted.length}
            </label>
            <BulkActionBar entity="pricing_rules" ids={sel.ids} onClear={sel.clear} onChanged={invalidate} />
          </div>
        )}
        {sorted.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No fixed routes yet.</p>
        ) : view === "list" ? (
          <ul className="divide-y divide-border">
            {sorted.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Checkbox checked={sel.isSelected(String(r.id))} onCheckedChange={() => sel.toggle(String(r.id))} aria-label="Select route" />
                <button className="min-w-0 flex-1 text-left" onClick={() => { setDraft(rowToDraft(r)); setLiveRoute(null); }}>
                  <p className="truncate text-sm font-medium">
                    {r.from_place_label ?? r.from_address}
                    {(r.bidirectional ?? r.valid_for_return) !== false ? <ArrowLeftRight className="mx-1.5 inline size-3.5 text-primary" /> : " → "}
                    {r.to_place_label ?? r.to_address}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    £{Number(r.price).toFixed(2)} · priority {Number(r.priority ?? 100)}
                    {Number(r.from_radius_miles ?? 0) > 0 && ` · start ${Number(r.from_radius_miles)} mi`}
                    {Number(r.to_radius_miles ?? 0) > 0 && ` · end ${Number(r.to_radius_miles)} mi`}
                  </p>
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {r.active ? "Active" : "Paused"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((r) => (
              <div key={r.id} className="relative rounded-xl border border-border bg-background transition hover:border-primary/40">
                <span className="absolute right-3 top-3">
                  <Checkbox checked={sel.isSelected(String(r.id))} onCheckedChange={() => sel.toggle(String(r.id))} aria-label="Select route" />
                </span>
                <button
                  onClick={() => { setDraft(rowToDraft(r)); setLiveRoute(null); }}
                  className="block w-full p-4 pr-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {r.from_place_label ?? r.from_address}
                      {(r.bidirectional ?? r.valid_for_return) !== false ? <ArrowLeftRight className="mx-1.5 inline size-3.5 text-primary" /> : " → "}
                      {r.to_place_label ?? r.to_address}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.active ? "Active" : "Paused"}
                  </p>
                  <p className="mt-2 font-display text-xl font-semibold tabular-nums">£{Number(r.price).toFixed(2)}</p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    Priority {Number(r.priority ?? 100)}
                    {Number(r.from_radius_miles ?? 0) > 0 && ` · start ${Number(r.from_radius_miles)} mi`}
                    {Number(r.to_radius_miles ?? 0) > 0 && ` · end ${Number(r.to_radius_miles)} mi`}
                  </p>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
