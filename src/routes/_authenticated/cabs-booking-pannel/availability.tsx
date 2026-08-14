import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listAvailabilityRules,
  upsertAvailabilityRule,
  deleteAvailabilityRule,
} from "@/lib/pricing-admin.functions";
import { listVehicleClassesAdmin } from "@/lib/vehicle-classes.functions";
import { listVehiclesAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Ban, CheckCircle2, List, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { GeoFields, Chips, DayPicker, SERVICE_TYPE_OPTIONS, DAYS } from "@/components/admin/RuleFields";
import { AvailabilityCalendar } from "@/components/admin/AvailabilityCalendar";

const opts = queryOptions({ queryKey: ["admin", "availability-rules"], queryFn: () => listAvailabilityRules() });
const classOpts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });
const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/availability")({
  head: () => ({
    meta: [
      { title: "Availability Rules — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: availability blocks and allowances." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(opts),
    context.queryClient.ensureQueryData(classOpts),
    context.queryClient.ensureQueryData(vOpts),
  ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = {
  id: undefined as string | undefined,
  name: "",
  rule_scope: "global",
  effect: "block",
  vehicle_id: null as string | null,
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
  reason: "",
  active: true,
};

const SCOPE_LABEL: Record<string, string> = {
  global: "Global",
  service: "Service",
  vehicle_class: "Vehicle class",
  vehicle: "Single vehicle",
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: classData } = useSuspenseQuery(classOpts);
  const { data: vehicles } = useSuspenseQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertAvailabilityRule);
  const del = useServerFn(deleteAvailabilityRule);
  const [form, setForm] = useState<any>(null);
  const [view, setView] = useState<"list" | "calendar">("list");

  const openEdit = (r: any) => setForm({
    ...empty, ...r,
    service_types: r.service_types ?? [],
    days_of_week: r.days_of_week ?? [],
    date_from: r.date_from ?? "", date_to: r.date_to ?? "",
    time_from: r.time_from ?? "", time_to: r.time_to ?? "",
    reason: r.reason ?? "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "availability-rules"] });
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
        title="Availability Rules"
        description="Block or explicitly allow bookings by vehicle, class, service, area, date or time. The most specific matching rule wins; ties break to block."
      >
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New rule</Button>
      </PageHeader>

      {data.length === 0 ? (
        <EmptyState title="No availability rules" hint="Everything is bookable. Add a rule to close a date, area or vehicle." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    {r.effect === "block"
                      ? <Ban className="size-4 text-destructive" />
                      : <CheckCircle2 className="size-4 text-emerald-600" />}
                    {r.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{SCOPE_LABEL[r.rule_scope] ?? r.rule_scope} · priority {r.priority}</div>
                </div>
                <StatusBadge status={r.active ? "active" : "inactive"} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                {r.vehicle?.name && <div>Vehicle: {r.vehicle.name}</div>}
                {r.vehicle_class?.name && <div>Class: {r.vehicle_class.name}</div>}
                {r.service_types?.length > 0 && <div>Services: {r.service_types.join(", ")}</div>}
                {r.place_label && <div>{r.place_label} · {Number(r.radius_miles)} mi · {r.scope}</div>}
                {(r.date_from || r.date_to) && <div>{r.date_from ?? "—"} → {r.date_to ?? "—"}</div>}
                {(r.time_from || r.time_to) && <div>{r.time_from ?? "00:00"} – {r.time_to ?? "23:59"}</div>}
                {r.days_of_week?.length > 0 && <div>{r.days_of_week.map((d: number) => DAYS[d]).join(", ")}</div>}
                {r.reason && <div className="italic">{r.reason}</div>}
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button aria-label="Edit" size="sm" variant="ghost" onClick={() => setForm({
                  ...empty, ...r,
                  service_types: r.service_types ?? [],
                  days_of_week: r.days_of_week ?? [],
                  date_from: r.date_from ?? "", date_to: r.date_to ?? "",
                  time_from: r.time_from ?? "", time_to: r.time_to ?? "",
                  reason: r.reason ?? "",
                })}><Edit className="size-4" /></Button>
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
          <DialogHeader><DialogTitle>{form?.id ? "Edit availability rule" : "New availability rule"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="av-name">Name *</Label>
                <Input id="av-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="av-scope">Applies to</Label>
                <select id="av-scope" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.rule_scope} onChange={(e) => setForm({ ...form, rule_scope: e.target.value })}>
                  <option value="global">Everything (global)</option>
                  <option value="service">Specific service types</option>
                  <option value="vehicle_class">Specific vehicle class</option>
                  <option value="vehicle">Single vehicle</option>
                </select>
              </div>
              <div>
                <Label htmlFor="av-effect">Effect</Label>
                <select id="av-effect" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value })}>
                  <option value="block">Block bookings</option>
                  <option value="allow">Allow (override a broader block)</option>
                </select>
              </div>

              {form.rule_scope === "vehicle" && (
                <div className="col-span-2">
                  <Label htmlFor="av-vehicle">Vehicle *</Label>
                  <select id="av-vehicle" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.vehicle_id ?? ""} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value || null })}>
                    <option value="">Select vehicle</option>
                    {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              {form.rule_scope === "vehicle_class" && (
                <div className="col-span-2">
                  <Label htmlFor="av-class">Vehicle class *</Label>
                  <select id="av-class" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.vehicle_class_id ?? ""} onChange={(e) => setForm({ ...form, vehicle_class_id: e.target.value || null })}>
                    <option value="">Select class</option>
                    {classData.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <Label>Service types {form.rule_scope === "service" ? "*" : "(empty = all)"}</Label>
                <Chips options={SERVICE_TYPE_OPTIONS} selected={form.service_types ?? []} onToggle={toggleService} />
              </div>

              <GeoFields id="av-place" form={form} setForm={setForm} />

              <div>
                <Label htmlFor="av-from">Date from</Label>
                <Input id="av-from" type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="av-to">Date to</Label>
                <Input id="av-to" type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="av-tfrom">Time from</Label>
                <Input id="av-tfrom" type="time" value={form.time_from} onChange={(e) => setForm({ ...form, time_from: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="av-tto">Time to</Label>
                <Input id="av-tto" type="time" value={form.time_to} onChange={(e) => setForm({ ...form, time_to: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Days of week (empty = all)</Label>
                <DayPicker selected={form.days_of_week ?? []} onToggle={toggleDay} />
              </div>

              <div>
                <Label htmlFor="av-priority">Priority</Label>
                <Input id="av-priority" type="number" min="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch id="av-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="av-active">Active</Label>
              </div>

              <div className="col-span-2">
                <Label htmlFor="av-reason">Reason (shown to staff only)</Label>
                <Textarea id="av-reason" rows={2} value={form.reason ?? ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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
