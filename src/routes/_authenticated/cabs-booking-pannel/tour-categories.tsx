import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ListError } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listTourCategories, saveTourCategory, deleteTourCategory } from "@/lib/tour-admin-tools.functions";

const catOpts = queryOptions({ queryKey: ["admin", "tour-categories"], queryFn: () => listTourCategories() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/tour-categories")({
  head: () => ({
    meta: [
      { title: "Tour categories — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: tour categories." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catOpts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  component: TourCategoriesPage,
});

type Cat = { id: string; name: string; description: string | null; sort_order: number; active: boolean; tours: { total: number; live: number } };

function TourCategoriesPage() {
  const qc = useQueryClient();
  const list = useQuery(catOpts);
  const save = useServerFn(saveTourCategory);
  const remove = useServerFn(deleteTourCategory);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState<Record<string, Partial<Cat>>>({});
  const cats = (list.data ?? []) as Cat[];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "tour-categories"] });
    qc.invalidateQueries({ queryKey: ["admin", "scenic-templates"] });
    qc.invalidateQueries({ queryKey: ["admin", "tour-builder-options"] });
  };
  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try { await fn(); refresh(); toast.success(done); }
    catch (e: any) { toast.error(e.message ?? "Couldn't save"); }
    finally { setBusy(null); }
  }
  const value = (c: Cat) => ({ ...c, ...edits[c.id] });
  const saveRow = (c: Cat, patch: Partial<Cat> = {}) => {
    const v = { ...value(c), ...patch };
    return run(c.id, () => save({ data: { id: c.id, name: v.name, description: v.description ?? null, sort_order: v.sort_order, active: v.active } }), "Category saved")
      .then(() => setEdits((e) => { const n = { ...e }; delete n[c.id]; return n; }));
  };
  // Swap positions with the neighbour and renumber in steps of 10.
  const move = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= cats.length) return;
    const order = [...cats];
    [order[i], order[j]] = [order[j]!, order[i]!];
    await run("order", async () => {
      for (let k = 0; k < order.length; k++) {
        const c = order[k]!;
        if (c.sort_order !== (k + 1) * 10) await save({ data: { id: c.id, name: c.name, description: c.description, sort_order: (k + 1) * 10, active: c.active } });
      }
    }, "Order saved");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tour categories"
        description="The filters on the Tours page (up to 7 shown). Renaming a category renames it on every tour in it; deleting one leaves its tours without a category."
      />
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim().length < 2) return;
          void run("new", () => save({ data: { name: newName.trim(), sort_order: (cats.length + 1) * 10, active: true } }), "Category added").then(() => setNewName(""));
        }}
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name" className="w-72" aria-label="New category name" />
        <Button type="submit" disabled={busy === "new" || newName.trim().length < 2}>
          {busy === "new" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add category
        </Button>
      </form>

      {list.isError ? <ListError error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Tours</th><th className="px-4 py-3">Shown on site</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {cats.map((c, i) => {
                const v = value(c);
                const dirty = !!edits[c.id];
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Move ${c.name} up`} disabled={i === 0 || !!busy} onClick={() => void move(i, -1)}><ArrowUp className="size-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Move ${c.name} down`} disabled={i === cats.length - 1 || !!busy} onClick={() => void move(i, 1)}><ArrowDown className="size-4" /></Button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Input value={v.name} aria-label="Category name" onChange={(e) => setEdits((x) => ({ ...x, [c.id]: { ...x[c.id], name: e.target.value } }))} className="h-8 w-64" />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.tours.total} ({c.tours.live} live)</td>
                    <td className="px-4 py-2">
                      <Switch checked={v.active} aria-label={`Show ${c.name} on the site`} disabled={busy === c.id} onCheckedChange={(on) => void saveRow(c, { active: on })} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={!dirty || busy === c.id} onClick={() => void saveRow(c)}><Save className="size-4" /> Save</Button>
                        <Button
                          size="sm" variant="ghost" aria-label={`Delete ${c.name}`} disabled={busy === c.id}
                          onClick={() => {
                            if (!confirm(c.tours.total ? `Delete "${c.name}"? Its ${c.tours.total} tour(s) will have no category until you choose a new one.` : `Delete "${c.name}"?`)) return;
                            void run(c.id, () => remove({ data: { id: c.id } }), "Category deleted");
                          }}
                        ><Trash2 className="size-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        A category only appears as a filter on the Tours page when it is shown on the site and has at least one live tour.
      </p>
    </div>
  );
}
