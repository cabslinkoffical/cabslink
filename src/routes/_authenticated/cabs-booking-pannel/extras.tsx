import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { listExtrasAdmin, upsertExtra, deleteExtra, setExtraActive } from "@/lib/extras.functions";
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
};

type FormState = {
  id?: string;
  key: string;
  name: string;
  description: string;
  price: number;
  price_basis: "per_unit" | "per_booking" | "per_hour";
  max_quantity: number;
  applies_to_all_classes: boolean;
  active: boolean;
  sort_order: number;
  class_ids: string[];
};

const blank: FormState = {
  key: "",
  name: "",
  description: "",
  price: 0,
  price_basis: "per_unit",
  max_quantity: 1,
  applies_to_all_classes: true,
  active: true,
  sort_order: 100,
  class_ids: [],
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
          class_ids: f.applies_to_all_classes ? [] : f.class_ids,
        },
      }),
    onSuccess: async () => { await refresh(); toast.success("Extra saved"); setForm(null); },
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
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Extras"
        description="Every bookable add-on lives here once. Pricing Schemes reference these records — they never redefine them."
      >
        <ViewToggle mode={view} onChange={setView} />
        <BulkTools entity="extras" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "extras"] })} />
        <Button onClick={() => setForm({ ...blank })}><Plus className="size-4 mr-1" /> New extra</Button>
      </PageHeader>

      {data.extras.length === 0 ? (
        <EmptyState title="No extras yet" hint="Create Child Seat, Meet & Greet or any other add-on." />
      ) : (
        <div className={view === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-2"}>
          {data.extras.map((e: any) => (
            <div key={e.id} className={`rounded-2xl border border-border bg-card shadow-sm ${view === "grid" ? "p-5" : "flex flex-wrap items-center gap-4 px-5 py-3"}`}>
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
                {e.price_basis === "per_unit" && (
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
              <div className={view === "grid" ? "mt-4 flex justify-end gap-1" : "flex gap-1"}>
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
                    applies_to_all_classes: e.applies_to_all_classes,
                    active: e.active,
                    sort_order: e.sort_order,
                    class_ids: e.class_ids,
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
      )}

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
                      <SelectItem value="per_unit">Per unit</SelectItem>
                      <SelectItem value="per_booking">Per booking</SelectItem>
                      <SelectItem value="per_hour">Per hour</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Max quantity">
                  <Input type="number" min="1" max="20" value={form.max_quantity}
                    onChange={(e) => setForm({ ...form, max_quantity: Math.max(1, Number(e.target.value) || 1) })} />
                </Field>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <Switch checked={form.applies_to_all_classes}
                  onCheckedChange={(v) => setForm({ ...form, applies_to_all_classes: v })} />
                <span className="text-sm">Available on every vehicle class</span>
              </div>

              {!form.applies_to_all_classes && (
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle classes</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.classes.map((c: any) => {
                      const on = form.class_ids.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox" checked={on}
                            onChange={() => setForm({
                              ...form,
                              class_ids: on ? form.class_ids.filter((x) => x !== c.id) : [...form.class_ids, c.id],
                            })}
                          />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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
