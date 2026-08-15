import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listLocationPricingRules,
  upsertLocationPricingRule,
  deleteLocationPricingRule,
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
import { GeoFields } from "@/components/admin/RuleFields";

const opts = queryOptions({ queryKey: ["admin", "location-pricing"], queryFn: () => listLocationPricingRules() });
const classOpts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/location-pricing")({
  head: () => ({
    meta: [
      { title: "Location Pricing — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: location-based pricing rules." },
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
  vehicle_class_id: null as string | null,
  price_type: "fixed",
  price: 0,
  included_distance_miles: 0,
  extra_per_mile: 0,
  place_id: null as string | null,
  place_label: null as string | null,
  radius_miles: 5,
  scope: "either",
  priority: 100,
  notes: "",
  active: true,
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: classData } = useSuspenseQuery(classOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertLocationPricingRule);
  const del = useServerFn(deleteLocationPricingRule);
  const [form, setForm] = useState<any>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "location-pricing"] });
  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { invalidate(); toast.success("Rule saved"); setForm(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Rule deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Location Pricing"
        description="Zone pricing anchored to a place + radius. Sits between fixed route pricing and mileage pricing in the precedence ladder."
      >
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New location rule</Button>
      </PageHeader>

      {data.length === 0 ? (
        <EmptyState title="No location pricing rules" hint="Add a rule to price all journeys touching a specific area." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r: any) => (
            <div key={r.id} className="admin-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.place_label ?? "Global"}{r.place_id ? ` · ${Number(r.radius_miles)} mi · ${r.scope}` : ""}
                  </div>
                </div>
                <StatusBadge status={r.active ? "active" : "inactive"} />
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">£{Number(r.price).toFixed(2)}</div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div>{r.price_type === "fixed" ? "Fixed total" : "Base fare + mileage"}</div>
                {Number(r.included_distance_miles) > 0 && <div>Includes {Number(r.included_distance_miles)} mi, then £{Number(r.extra_per_mile).toFixed(2)}/mi</div>}
                <div>Class: {r.vehicle_class?.name ?? "Any"}</div>
                <div>Priority {r.priority}</div>
                {!r.place_id && <div className="text-amber-600">No anchor location — applies everywhere</div>}
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button aria-label="Edit" size="sm" variant="ghost" onClick={() => setForm({ ...empty, ...r, notes: r.notes ?? "" })}><Edit className="size-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button aria-label="Delete" size="sm" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this rule?</AlertDialogTitle></AlertDialogHeader>
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
          <DialogHeader><DialogTitle>{form?.id ? "Edit location rule" : "New location rule"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="lp-name">Name *</Label>
                <Input id="lp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <GeoFields id="lp-place" form={form} setForm={setForm} />

              <div>
                <Label htmlFor="lp-type">Price type</Label>
                <select id="lp-type" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value })}>
                  <option value="fixed">Fixed total</option>
                  <option value="base">Base + mileage</option>
                </select>
              </div>
              <div>
                <Label htmlFor="lp-price">Price (£) *</Label>
                <Input id="lp-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              {form.price_type === "base" && (
                <>
                  <div>
                    <Label htmlFor="lp-inc">Included miles</Label>
                    <Input id="lp-inc" type="number" step="0.1" min="0" value={form.included_distance_miles} onChange={(e) => setForm({ ...form, included_distance_miles: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label htmlFor="lp-extra">Extra £/mile</Label>
                    <Input id="lp-extra" type="number" step="0.01" min="0" value={form.extra_per_mile} onChange={(e) => setForm({ ...form, extra_per_mile: Number(e.target.value) })} />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="lp-class">Vehicle class</Label>
                <select id="lp-class" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.vehicle_class_id ?? ""} onChange={(e) => setForm({ ...form, vehicle_class_id: e.target.value || null })}>
                  <option value="">Any class</option>
                  {classData.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="lp-priority">Priority</Label>
                <Input id="lp-priority" type="number" min="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>

              <div className="col-span-2">
                <Label htmlFor="lp-notes">Notes</Label>
                <Textarea id="lp-notes" rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch id="lp-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="lp-active">Active</Label>
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
