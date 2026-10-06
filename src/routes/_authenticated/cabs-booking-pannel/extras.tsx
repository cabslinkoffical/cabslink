import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { listExtrasAdmin, upsertExtra, deleteExtra, setExtraActive } from "@/lib/extras.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChargeSettingsCard } from "@/components/admin/ChargeSettingsCard";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";
import { BulkTools } from "@/components/admin/BulkTools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field } from "@/components/admin/scheme/GeoEditorLayout";

const opts = queryOptions({ queryKey: ["admin", "extras"], queryFn: () => listExtrasAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/extras")({
  head: () => ({
    meta: [
      { title: "Extras — Cabslink Admin" },
      { name: "description", content: "One canonical list of every bookable extra and the vehicle classes it applies to." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: ExtrasPage,
});

const BASIS_LABEL: Record<string, string> = {
  per_unit: "per unit",
  per_booking: "per booking",
  per_hour: "per hour",
  per_minute: "per minute",
};

const CATEGORIES = [
  { key: "child_seat", label: "Child seats" },
  { key: "meet_greet", label: "Meet & greet" },
  { key: "waiting", label: "Waiting time" },
  { key: "other", label: "Other extras" },
] as const;
type Category = (typeof CATEGORIES)[number]["key"];

type FormState = {
  id?: string;
  key: string;
  name: string;
  description: string;
  price: number;
  price_basis: "per_unit" | "per_booking" | "per_hour" | "per_minute";
  max_quantity: number;
  category: Category;
  applies_to_all_classes: boolean;
  active: boolean;
  sort_order: number;
  class_ids: string[];
  /** classId → override price in £ ("" = use the default price). */
  class_prices: Record<string, string>;
  /** classId → customer limit ("" = use the default limit, "0" = not offered). */
  class_max: Record<string, string>;
};

const blank: FormState = {
  key: "",
  name: "",
  description: "",
  price: 0,
  price_basis: "per_unit",
  max_quantity: 1,
  category: "other",
  applies_to_all_classes: true,
  active: true,
  sort_order: 100,
  class_ids: [],
  class_prices: {},
  class_max: {},
};

function ExtrasPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const save = useServerFn(upsertExtra);
  const remove = useServerFn(deleteExtra);
  const toggle = useServerFn(setExtraActive);
  const [form, setForm] = useState<FormState | null>(null);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "extras"] }),
      qc.invalidateQueries({ queryKey: ["admin", "scheme-extras"] }),
    ]);

  const saveM = useMutation({
    mutationFn: (f: FormState) =>
      save({
        data: {
          id: f.id,
          key: f.key.trim(),
          name: f.name.trim(),
          description: f.description.trim() || null,
          price_pence: Math.round(f.price * 100),
          price_basis: f.price_basis,
          max_quantity: f.max_quantity,
          applies_to_all_classes: f.applies_to_all_classes,
          active: f.active,
          sort_order: f.sort_order,
          category: f.category,
          // Every class keeps its own price/limit; blank means "use the default".
          class_ids: f.applies_to_all_classes ? data.classes.map((c: any) => c.id) : f.class_ids,
          class_prices: Object.fromEntries(
            (f.applies_to_all_classes ? data.classes.map((c: any) => c.id) : f.class_ids).map((c: string) => {
              const raw = (f.class_prices[c] ?? "").trim();
              return [c, raw === "" ? null : Math.round(Number(raw) * 100)];
            }),
          ),
          class_max: Object.fromEntries(
            (f.applies_to_all_classes ? data.classes.map((c: any) => c.id) : f.class_ids).map((c: string) => {
              const raw = (f.class_max[c] ?? "").trim();
              return [c, raw === "" ? null : Math.max(0, Math.round(Number(raw)))];
            }),
          ),
        },
      }),
    onSuccess: () => { setForm(null); toast.success("Extra saved"); void refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const delM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => { await refresh(); toast.success("Extra deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const toggleM = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const classNames = new Map(data.classes.map((c: any) => [c.id, c.name]));
  const [view, setView] = useViewMode("extras");
  const canSave = !!form && form.name.trim().length > 1 && /^[a-z0-9_]+$/.test(form.key.trim());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extras"
        description="Every add-on, its price for each vehicle class, VAT and cancellation cover — all in one place."
      >
        <ViewToggle mode={view} onChange={setView} />
        <BulkTools entity="extras" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "extras"] })} />
        <Button onClick={() => setForm({ ...blank })}><Plus className="size-4 mr-1" /> New extra</Button>
      </PageHeader>

      <Tabs defaultValue="class">
        <TabsList>
          <TabsTrigger value="class">Vehicle class extras</TabsTrigger>
          <TabsTrigger value="other">Other extras (VAT &amp; cancellation cover)</TabsTrigger>
        </TabsList>
        <TabsContent value="class" className="mt-4">
      {data.extras.length === 0 ? (
        <EmptyState title="No extras yet" hint="Create Child Seat, Meet & Greet or any other add-on." />
      ) : (
        <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const items = data.extras.filter((e: any) => (e.category ?? "other") === cat.key);
          if (!items.length) return null;
          return (
        <section key={cat.key}>
        <h2 className="mb-3 font-display text-lg font-semibold">{cat.label}</h2>
        <div className={view === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-2"}>
          {items.map((e: any) => (
            <div key={e.id} className={`rounded-2xl border border-border bg-card shadow-sm ${view === "grid" ? "flex h-full flex-col p-5" : "flex flex-wrap items-center gap-4 px-5 py-3"}`}>
              <div className={view === "grid" ? "flex items-start gap-3" : "flex min-w-[14rem] flex-1 items-center gap-3"}>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold truncate">{e.name}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{e.key}</p>
                </div>
                <div className="flex-1" />
                <Switch
                  checked={e.active}
                  onCheckedChange={(v) => toggleM.mutate({ id: e.id, active: v })}
                  aria-label={`Toggle ${e.name}`}
                />
              </div>
              {e.description && view === "grid" && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>}
              <p className={view === "grid" ? "mt-3 text-sm font-semibold tabular-nums" : "text-sm font-semibold tabular-nums"}>
                £{(e.price_pence / 100).toFixed(2)}{" "}
                <span className="text-xs font-normal text-muted-foreground">{BASIS_LABEL[e.price_basis]}</span>
                {e.price_basis !== "per_booking" && (
                  <span className="text-xs font-normal text-muted-foreground"> · max {e.max_quantity}</span>
                )}
              </p>
              <p className={view === "grid" ? "mt-2 text-xs text-muted-foreground" : "text-xs text-muted-foreground"}>
                {e.applies_to_all_classes
                  ? "Applies to all vehicle classes"
                  : e.class_ids.length
                    ? `Classes: ${e.class_ids.map((c: string) => classNames.get(c) ?? "—").join(", ")}`
                    : "No vehicle classes selected"}
              </p>
              <div className={view === "grid" ? "mt-auto pt-4 flex justify-end gap-1" : "flex gap-1"}>
                <Button
                  size="icon" variant="ghost" aria-label="Edit"
                  onClick={() => setForm({
                    id: e.id,
                    key: e.key,
                    name: e.name,
                    description: e.description ?? "",
                    price: e.price_pence / 100,
                    price_basis: e.price_basis,
                    max_quantity: e.max_quantity,
                    category: (e.category ?? "other") as Category,
                    applies_to_all_classes: e.applies_to_all_classes,
                    active: e.active,
                    sort_order: e.sort_order,
                    class_ids: e.class_ids,
                    class_prices: Object.fromEntries(
                      Object.entries((e.class_prices ?? {}) as Record<string, number | null>)
                        .map(([cid, pence]) => [cid, pence == null ? "" : (Number(pence) / 100).toFixed(2)]),
                    ),
                    class_max: Object.fromEntries(
                      Object.entries((e.class_max ?? {}) as Record<string, number | null>)
                        .map(([cid, m]) => [cid, m == null ? "" : String(m)]),
                    ),
                  })}
                >
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete “{e.name}”?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive" onClick={() => delM.mutate(e.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
        </section>
          );
        })}
        </div>
      )}

        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <ChargeSettingsCard />
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit extra" : "New extra"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Key" hint="Stable identifier, lowercase with underscores.">
                  <Input
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                  />
                </Field>
              </div>
              <Field label="Group" hint="Where this extra is listed in admin and on the booking form.">
                <Select value={form.category} onValueChange={(v: any) => setForm({
                  ...form,
                  category: v,
                  price_basis: v === "waiting" && form.price_basis !== "per_hour" ? "per_minute" : form.price_basis,
                })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Description">
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Price (£)">
                  <Input type="number" step="0.01" min="0" value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} />
                </Field>
                <Field label="Charged">
                  <Select value={form.price_basis} onValueChange={(v: any) => setForm({ ...form, price_basis: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {form.category === "waiting" ? (
                        <>
                          <SelectItem value="per_minute">Per minute</SelectItem>
                          <SelectItem value="per_hour">Per hour</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="per_unit">Per unit</SelectItem>
                          <SelectItem value="per_booking">Per booking</SelectItem>
                          <SelectItem value="per_hour">Per hour</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={form.price_basis === "per_minute" ? "Max minutes" : form.price_basis === "per_hour" ? "Max hours" : "Max quantity"}
                  hint="Default limit a customer can choose.">
                  <Input type="number" min="1" max="600" value={form.max_quantity}
                    onChange={(e) => setForm({ ...form, max_quantity: Math.min(600, Math.max(1, Number(e.target.value) || 1)) })} />
                </Field>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <Switch checked={form.applies_to_all_classes}
                  onCheckedChange={(v) => setForm({ ...form, applies_to_all_classes: v })} />
                <span className="text-sm">Available on every vehicle class (otherwise tick the classes below)</span>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price and limit per vehicle class</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Leave blank to use the defaults above. Set the limit to 0 to hide this extra for that class.
                </p>
                <div className="grid gap-2">
                  {data.classes.map((c: any) => {
                    const on = form.applies_to_all_classes || form.class_ids.includes(c.id);
                    return (
                      <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <label className="flex min-w-[10rem] flex-1 items-center gap-2">
                          {!form.applies_to_all_classes && (
                            <input
                              type="checkbox" checked={on}
                              onChange={() => setForm({
                                ...form,
                                class_ids: on ? form.class_ids.filter((x) => x !== c.id) : [...form.class_ids, c.id],
                              })}
                            />
                          )}
                          {c.name}
                        </label>
                        {on && (
                          <>
                            <Input
                              className="h-8 w-24" aria-label={`${c.name} price`}
                              type="number" step="0.01" min="0"
                              placeholder={`£${form.price.toFixed(2)}`}
                              value={form.class_prices[c.id] ?? ""}
                              onChange={(e) => setForm({ ...form, class_prices: { ...form.class_prices, [c.id]: e.target.value } })}
                            />
                            <Input
                              className="h-8 w-24" aria-label={`${c.name} limit`}
                              type="number" step="1" min="0" max="600"
                              placeholder={`max ${form.max_quantity}`}
                              value={form.class_max[c.id] ?? ""}
                              onChange={(e) => setForm({ ...form, class_max: { ...form.class_max, [c.id]: e.target.value } })}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display order">
                  <Input type="number" min="0" value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
                </Field>
                <div className="flex items-center gap-3 self-end rounded-lg border border-border px-4 py-2.5">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <span className="text-sm">Active</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={() => saveM.mutate(form)} disabled={!canSave || saveM.isPending}>
                  {saveM.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}Save extra
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
