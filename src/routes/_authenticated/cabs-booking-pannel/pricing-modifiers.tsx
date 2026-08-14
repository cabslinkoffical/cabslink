import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listPricingModifiers,
  upsertPricingModifier,
  deletePricingModifier,
} from "@/lib/pricing-admin.functions";
import { listVehicleClassesAdmin } from "@/lib/vehicle-classes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { GeoFields, Chips, DayPicker, SERVICE_TYPE_OPTIONS, DAYS } from "@/components/admin/RuleFields";

const opts = queryOptions({ queryKey: ["admin", "pricing-modifiers"], queryFn: () => listPricingModifiers() });
const classOpts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/pricing-modifiers")({
  head: () => ({
    meta: [
      { title: "Pricing Modifiers — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: surge, event and discount modifiers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(opts),
    context.queryClient.ensureQueryData(classOpts),
  ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = {
  id: undefined as string | undefined,
  name: "",
  modifier_type: "percent",
  value: 0,
  stackable: false,
  vehicle_class_id: null as string | null,
  service_types: [] as string[],
  date_from: "",
  date_to: "",
  days_of_week: [] as number[],
  time_from: "",
  time_to: "",
  place_id: null as string | null,
  place_label: null as string | null,
  radius_miles: 10,
  scope: "either",
  priority: 100,
  notes: "",
  active: true,
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: classData } = useSuspenseQuery(classOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPricingModifier);
  const del = useServerFn(deletePricingModifier);
  const [form, setForm] = useState<any>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "pricing-modifiers"] });
  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { invalidate(); toast.success("Modifier saved"); setForm(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Modifier deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  function toggleService(v: string) {
    const cur: string[] = form.service_types ?? [];
    setForm({ ...form, service_types: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  }
  function toggleDay(d: number) {
    const cur: number[] = form.days_of_week ?? [];
    setForm({ ...form, days_of_week: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort() });
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Pricing Modifiers"
        description="Surge uplifts, event pricing and automatic discounts applied on top of the resolved fare. Non-stackable modifiers resolve by priority."
      >
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New modifier</Button>
      </PageHeader>

      {data.length === 0 ? (
        <EmptyState title="No pricing modifiers" hint="Add a modifier for peak periods, events or seasonal discounts." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.stackable ? "Stackable" : "Exclusive"} · priority {r.priority}</div>
                </div>
                <StatusBadge status={r.active ? "active" : "inactive"} />
              </div>
              <div className={`mt-3 text-2xl font-semibold tabular-nums ${Number(r.value) < 0 ? "text-emerald-600" : ""}`}>
                {r.modifier_type === "percent" ? `${Number(r.value) > 0 ? "+" : ""}${Number(r.value)}%` : `${Number(r.value) > 0 ? "+" : "−"}£${Math.abs(Number(r.value)).toFixed(2)}`}
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div>Class: {r.vehicle_class?.name ?? "Any"}</div>
                {r.service_types?.length > 0 && <div>Services: {r.service_types.join(", ")}</div>}
                {r.place_label && <div>{r.place_label} · {Number(r.radius_miles)} mi · {r.scope}</div>}
                {(r.date_from || r.date_to) && <div>{r.date_from ?? "—"} → {r.date_to ?? "—"}</div>}
                {(r.time_from || r.time_to) && <div>{r.time_from ?? "00:00"} – {r.time_to ?? "23:59"}</div>}
                {r.days_of_week?.length > 0 && <div>{r.days_of_week.map((d: number) => DAYS[d]).join(", ")}</div>}
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button aria-label="Edit" size="sm" variant="ghost" onClick={() => setForm({
                  ...empty, ...r,
                  service_types: r.service_types ?? [],
                  days_of_week: r.days_of_week ?? [],
                  date_from: r.date_from ?? "", date_to: r.date_to ?? "",
                  time_from: r.time_from ?? "", time_to: r.time_to ?? "",
                  notes: r.notes ?? "",
                })}><Edit className="size-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button aria-label="Delete" size="sm" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this modifier?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(r.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit modifier" : "New modifier"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="pm-name">Name *</Label>
                <Input id="pm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pm-type">Type</Label>
                <select id="pm-type" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.modifier_type} onChange={(e) => setForm({ ...form, modifier_type: e.target.value })}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed £</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pm-value">Value * (negative = discount)</Label>
                <Input id="pm-value" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>

              <div>
                <Label htmlFor="pm-class">Vehicle class</Label>
                <select id="pm-class" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.vehicle_class_id ?? ""} onChange={(e) => setForm({ ...form, vehicle_class_id: e.target.value || null })}>
                  <option value="">Any class</option>
                  {classData.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="pm-priority">Priority</Label>
                <Input id="pm-priority" type="number" min="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>

              <div className="col-span-2">
                <Label>Service types (empty = all)</Label>
                <Chips options={SERVICE_TYPE_OPTIONS} selected={form.service_types ?? []} onToggle={toggleService} />
              </div>

              <GeoFields id="pm-place" form={form} setForm={setForm} />

              <div>
                <Label htmlFor="pm-from">Date from</Label>
                <Input id="pm-from" type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pm-to">Date to</Label>
                <Input id="pm-to" type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pm-tfrom">Time from</Label>
                <Input id="pm-tfrom" type="time" value={form.time_from} onChange={(e) => setForm({ ...form, time_from: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pm-tto">Time to</Label>
                <Input id="pm-tto" type="time" value={form.time_to} onChange={(e) => setForm({ ...form, time_to: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Days of week (empty = all)</Label>
                <DayPicker selected={form.days_of_week ?? []} onToggle={toggleDay} />
              </div>

              <div className="col-span-2">
                <Label htmlFor="pm-notes">Notes</Label>
                <Textarea id="pm-notes" rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="pm-stack" checked={form.stackable} onCheckedChange={(v) => setForm({ ...form, stackable: v })} />
                  <Label htmlFor="pm-stack">Stackable</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="pm-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label htmlFor="pm-active">Active</Label>
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
