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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, SchemeSection } from "./GeoEditorLayout";
import { deleteSchemeModifier, upsertSchemeModifier } from "@/lib/pricing-schemes.functions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SERVICES = ["airport", "transfer", "hourly", "tour", "corporate", "sports"];

type Draft = {
  id?: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  dateFrom: string;
  dateTo: string;
  days: number[];
  timeFrom: string;
  timeTo: string;
  services: string[];
  priority: number;
  stackable: boolean;
  notes: string;
  active: boolean;
  allClasses: boolean;
};

const empty: Draft = {
  name: "", type: "percent", value: 10, dateFrom: "", dateTo: "", days: [],
  timeFrom: "", timeTo: "", services: [], priority: 100, stackable: true, notes: "", active: true, allClasses: false,
};

export function SchemeModifiersTab({ classId, modifiers }: { classId: string; modifiers: any[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(empty);
  const upsert = useServerFn(upsertSchemeModifier);
  const remove = useServerFn(deleteSchemeModifier);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "pricing-scheme", classId] }),
    qc.invalidateQueries({ queryKey: ["admin", "pricing-schemes"] }),
    qc.invalidateQueries({ queryKey: ["quotes"] }),
  ]);

  const allIds = useMemo(() => modifiers.map((m) => String(m.id)), [modifiers]);
  const sel = useRowSelection(allIds);

  const save = useMutation({
    mutationFn: () => {
      if (!draft.name.trim()) throw new Error("Give the modifier a name.");
      if (draft.value === 0) throw new Error("Enter an uplift value (use a negative value to reduce the price).");
      return upsert({
        data: {
          id: draft.id,
          classId,
          all_classes: draft.allClasses,
          name: draft.name.trim(),
          modifier_type: draft.type,
          value: draft.value,
          date_from: draft.dateFrom || null,
          date_to: draft.dateTo || null,
          days_of_week: draft.days,
          time_from: draft.timeFrom || null,
          time_to: draft.timeTo || null,
          service_types: draft.services,
          priority: draft.priority,
          stackable: draft.stackable,
          notes: draft.notes || null,
          active: draft.active,
        } as any,
      });
    },
    onSuccess: async () => { await invalidate(); setDraft(empty); toast.success("Modifier saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the modifier"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => { await invalidate(); setDraft(empty); toast.success("Modifier deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the modifier"),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <SchemeSection
        title={draft.id ? "Edit modifier" : "Add modifier"}
        hint="The one place for surcharges and uplifts: date, day, time and service-type rules. Percentages are sized against the pre-tax subtotal."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modifier name">
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Christmas period uplift" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={draft.type} onValueChange={(v) => set("type", v as Draft["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed £</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={draft.type === "percent" ? "Value (%)" : "Value (£)"}>
              <Input type="number" step="0.01" value={draft.value} onChange={(e) => set("value", Number(e.target.value || 0))} />
            </Field>
          </div>
          <Field label="Date from" hint="Leave blank for no date limit.">
            <Input type="date" value={draft.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
          </Field>
          <Field label="Date to">
            <Input type="date" value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
          </Field>
          <Field label="Time from" hint="Leave blank to apply all day.">
            <Input type="time" value={draft.timeFrom} onChange={(e) => set("timeFrom", e.target.value)} />
          </Field>
          <Field label="Time to">
            <Input type="time" value={draft.timeTo} onChange={(e) => set("timeTo", e.target.value)} />
          </Field>
          <Field label="Priority" hint="Higher wins when a modifier is not stackable.">
            <Input type="number" min="0" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value || 0))} />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal note (optional)" />
          </Field>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Days of week" hint="None selected = every day.">
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("days", toggle(draft.days, i))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    draft.days.includes(i)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Service types" hint="None selected = all services.">
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("services", toggle(draft.services, s))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    draft.services.includes(s)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Switch checked={draft.stackable} onCheckedChange={(v) => set("stackable", v)} />
              <span className="text-sm">Stacks with other modifiers</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 sm:col-span-2">
              <Switch checked={draft.allClasses} onCheckedChange={(v) => set("allClasses", v)} />
              <span className="text-sm">
                Applies to every vehicle class
                <span className="block text-xs text-muted-foreground">
                  Use this for global surcharges such as late-night or holiday uplifts.
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
            {draft.id ? "Save modifier" : "Add modifier"}
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
      </SchemeSection>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
          <h3 className="font-display text-base font-semibold">Modifiers &amp; surcharges</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">This class plus any rule that applies to every class.</p>
                    </div>
          <BulkTools entity="pricing_modifiers" label="Bulk CSV" onChanged={invalidate} />
</div>
        {modifiers.length > 0 && (
          <div className="space-y-2 border-b border-border px-5 py-3">
            <label className="flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground">
              <Checkbox checked={sel.allSelected} onCheckedChange={() => sel.toggleAll()} />
              Select all {modifiers.length}
            </label>
            <BulkActionBar entity="pricing_modifiers" ids={sel.ids} onClear={sel.clear} onChanged={invalidate} />
          </div>
        )}
        {modifiers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No modifiers yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {modifiers.map((m) => {
              const selected = sel.isSelected(String(m.id));
              return (
              <li key={m.id} className={`flex flex-wrap items-center gap-3 border-l-4 px-5 py-3 transition-colors ${selected ? "border-l-primary bg-primary/10" : "border-l-transparent"}`}>
                <Checkbox checked={sel.isSelected(String(m.id))} onCheckedChange={() => sel.toggle(String(m.id))} aria-label="Select modifier" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraft({
                    id: m.id,
                    name: m.name ?? "",
                    type: (m.modifier_type === "fixed" ? "fixed" : "percent"),
                    value: Number(m.value ?? 0),
                    dateFrom: m.date_from ?? "",
                    dateTo: m.date_to ?? "",
                    days: Array.isArray(m.days_of_week) ? m.days_of_week.map(Number) : [],
                    timeFrom: (m.time_from ?? "").slice(0, 5),
                    timeTo: (m.time_to ?? "").slice(0, 5),
                    services: Array.isArray(m.service_types) ? m.service_types : [],
                    priority: Number(m.priority ?? 100),
                    stackable: m.stackable !== false,
                    notes: m.notes ?? "",
                    active: !!m.active,
                    allClasses: !m.vehicle_class_id,
                  })}
                >
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {m.modifier_type === "fixed" ? `£${Number(m.value).toFixed(2)}` : `${Number(m.value)}%`}
                    {m.date_from && ` · ${m.date_from}${m.date_to ? ` → ${m.date_to}` : ""}`}
                    {Array.isArray(m.days_of_week) && m.days_of_week.length > 0 && ` · ${m.days_of_week.map((d: number) => DAYS[d]).join(", ")}`}
                    {m.time_from && ` · ${String(m.time_from).slice(0, 5)}–${String(m.time_to ?? "").slice(0, 5)}`}
                    {` · priority ${Number(m.priority ?? 100)}`}
                    {!m.vehicle_class_id && " · all vehicle classes"}
                  </p>
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {m.active ? "Active" : "Paused"}
                </span>
                {selected && <span className="text-xs font-semibold text-primary">Selected</span>}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
