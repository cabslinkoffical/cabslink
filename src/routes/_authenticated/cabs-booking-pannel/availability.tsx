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
import { BulkTools } from "@/components/admin/BulkTools";
import { GeoFields, Chips, DayPicker, SERVICE_TYPE_OPTIONS, DAYS } from "@/components/admin/RuleFields";
import { AvailabilityCalendar } from "@/components/admin/AvailabilityCalendar";
import { PlaceAutocomplete } from "@/components/site/PlaceAutocomplete";

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
  to_place_id: null as string | null,
  to_place_label: null as string | null,
  to_radius_miles: 10,
  radius_miles: 10,
  scope: "either",
  priority: 100,
  reason: "",
  customer_message: "",
  active: true,
};

const SCOPE_LABEL: Record<string, string> = {
  global: "Global",
  service: "Service",
  vehicle_class: "Vehicle class",
  vehicle: "Single vehicle",
  route: "Route",
  location: "Location",
};

const TABS: { key: string; label: string; hint: string; scopes: string[]; newScope: string }[] = [
  { key: "all", label: "All rules", hint: "Every availability rule across the booking system.", scopes: [], newScope: "global" },
  { key: "vehicle", label: "Vehicles", hint: "Turn a vehicle or a whole vehicle class off for chosen dates, days, times or areas.", scopes: ["vehicle", "vehicle_class"], newScope: "vehicle_class" },
  { key: "route", label: "Routes", hint: "Close a specific route (from area → to area) for chosen dates, days or times. Matches both directions.", scopes: ["route"], newScope: "route" },
  { key: "location", label: "Locations", hint: "Block pickups and/or drop-offs inside an area, optionally only on certain dates, days or times.", scopes: ["location"], newScope: "location" },
  { key: "service", label: "Services", hint: "Close specific service types, e.g. airport transfers or tours.", scopes: ["service"], newScope: "service" },
  { key: "global", label: "Global", hint: "Close the whole booking system for a date range, day or time window.", scopes: ["global"], newScope: "global" },
];

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: classData } = useSuspenseQuery(classOpts);
  const { data: vehicles } = useSuspenseQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertAvailabilityRule);
  const del = useServerFn(deleteAvailabilityRule);
  const [form, setForm] = useState<any>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [tab, setTab] = useState<string>("all");
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]!;
  const rules = (data as any[]).filter((r) =>
    activeTab.scopes.length === 0 ? true : activeTab.scopes.includes(r.rule_scope),
  );

  const openEdit = (r: any) => setForm({
    ...empty, ...r,
    service_types: r.service_types ?? [],
    days_of_week: r.days_of_week ?? [],
    date_from: r.date_from ?? "", date_to: r.date_to ?? "",
    time_from: r.time_from ?? "", time_to: r.time_to ?? "",
    reason: r.reason ?? "",
    customer_message: r.customer_message ?? "",
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
        description="Block or explicitly allow bookings by vehicle, route, location, service or globally — down to the date, day and time. The most specific matching rule wins; ties break to block."
      >
        <BulkTools entity="availability_rules" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "availability-rules"] })} />
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border p-0.5">
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}>
              <List className="size-4 mr-1" /> List
            </Button>
            <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} onClick={() => setView("calendar")}>
              <CalendarDays className="size-4 mr-1" /> Calendar
            </Button>
          </div>
          <Button onClick={() => setForm({ ...empty, rule_scope: activeTab.newScope })}><Plus className="size-4 mr-1" /> New rule</Button>
        </div>
      </PageHeader>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {TABS.map((t) => {
            const count = t.scopes.length === 0 ? (data as any[]).length : (data as any[]).filter((r) => t.scopes.includes(r.rule_scope)).length;
            return (
              <Button key={t.key} size="sm" variant={tab === t.key ? "secondary" : "ghost"} onClick={() => setTab(t.key)}>
                {t.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
              </Button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">{activeTab.hint}</p>
      </div>

      {view === "calendar" ? (
        <AvailabilityCalendar rules={rules as any} onSelectRule={openEdit} />
      ) : rules.length === 0 ? (
        <EmptyState title="No rules in this tab" hint="Everything here is bookable. Use New rule to close a date, area, route or vehicle." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((r: any) => (
            <div key={r.id} className="admin-card p-4">
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
                {r.rule_scope === "route"
                  ? (r.place_label || r.to_place_label) && <div>{r.place_label ?? "—"} → {r.to_place_label ?? "—"}</div>
                  : r.place_label && <div>{r.place_label} · {Number(r.radius_miles)} mi · {r.scope}</div>}
                {(r.date_from || r.date_to) && <div>{r.date_from ?? "—"} → {r.date_to ?? "—"}</div>}
                {(r.time_from || r.time_to) && <div>{r.time_from ?? "00:00"} – {r.time_to ?? "23:59"}</div>}
                {r.days_of_week?.length > 0 && <div>{r.days_of_week.map((d: number) => DAYS[d]).join(", ")}</div>}
                {r.reason && <div className="italic">{r.reason}</div>}
                {r.customer_message && <div className="text-[var(--gold)]">Customer sees: “{r.customer_message}”</div>}
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button aria-label="Edit" size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="size-4" /></Button>
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
                  <option value="route">Route (from → to)</option>
                  <option value="location">Location / area</option>
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

              {form.rule_scope === "route" ? (
                <>
                  <div className="col-span-2">
                    <Label htmlFor="av-from-place">From location *</Label>
                    <PlaceAutocomplete
                      id="av-from-place"
                      value={form.place_id ? { placeId: form.place_id, label: form.place_label ?? "" } : null}
                      onChange={(p: any) => setForm({ ...form, place_id: p?.placeId ?? null, place_label: p?.label ?? null, lat: null, lng: null })}
                      placeholder="Search the start town, airport or postcode"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="av-to-place">To location *</Label>
                    <PlaceAutocomplete
                      id="av-to-place"
                      value={form.to_place_id ? { placeId: form.to_place_id, label: form.to_place_label ?? "" } : null}
                      onChange={(p: any) => setForm({ ...form, to_place_id: p?.placeId ?? null, to_place_label: p?.label ?? null })}
                      placeholder="Search the destination town, airport or postcode"
                    />
                  </div>
                  <div>
                    <Label htmlFor="av-from-radius">From radius (miles)</Label>
                    <Input id="av-from-radius" type="number" step="0.5" min="0" value={form.radius_miles ?? ""}
                      onChange={(e) => setForm({ ...form, radius_miles: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label htmlFor="av-to-radius">To radius (miles)</Label>
                    <Input id="av-to-radius" type="number" step="0.5" min="0" value={form.to_radius_miles ?? ""}
                      onChange={(e) => setForm({ ...form, to_radius_miles: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">Route rules match in both directions.</p>
                </>
              ) : (
                <GeoFields id="av-place" form={form} setForm={setForm} radiusRequired={form.rule_scope === "location"} />
              )}

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
              <div className="col-span-2">
                <Label htmlFor="av-cust">Reason shown to the customer (optional)</Label>
                <Textarea id="av-cust" rows={2} maxLength={400} placeholder="e.g. This vehicle is fully booked for your selected date — please pick another class or contact us."
                  value={form.customer_message ?? ""} onChange={(e) => setForm({ ...form, customer_message: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">Shown on the booking form when this rule blocks a journey. Leave empty to use the default message.</p>
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
