import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPois, upsertPoi, deletePoi } from "@/lib/scenic-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { BulkTools } from "@/components/admin/BulkTools";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "pois"], queryFn: () => listPois() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/pois")({
  head: () => ({
    meta: [
      { title: "Pois — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: pois." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: PoisPage,
});

const CATEGORIES = [
  "attraction", "viewpoint", "castle", "landmark",
  "comfort_stop", "fuel_stop", "toilet_stop", "passenger_pickup",
];

const empty = {
  id: undefined as string | undefined,
  slug: "", name: "", category: "attraction",
  place_id: "", short_description: "", address_label: "", image_url: "",
  scenic_score: 0, admin_priority: 0,
  featured: false, active: false,
  recommended_visit_minutes: 30, minimum_visit_minutes: 15, maximum_visit_minutes: 120,
  stop_fee_pence: 0, parking_fee_pence: 0,
};

function PoisPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPoi);
  const del = useServerFn(deletePoi);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await upsert({ data: { ...form, place_id: form.place_id || null } });
      toast.success("Saved");
      setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "pois"] });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this POI?")) return;
    try {
      await del({ data: { id } });
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "pois"] });
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="Points of Interest" description="Curated sightseeing stops used by scenic route templates.">
        <BulkTools entity="points_of_interest" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "pois"] })} />
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New POI</Button>
      </PageHeader>

      {data.pois.length === 0 ? (
        <EmptyState title="No POIs yet" hint="Create a POI, add a Google Place ID, then activate it." />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Place ID</th>
                <th className="px-3 py-2 text-right">Stop £</th>
                <th className="px-3 py-2 text-right">Parking £</th>
                <th className="px-3 py-2 text-right">Priority</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.pois.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                  <td className="px-3 py-2 font-mono text-[11px] max-w-[220px] truncate">{p.place_id ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{((p.stop_fee_pence ?? 0) / 100).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{((p.parking_fee_pence ?? 0) / 100).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.admin_priority ?? 0}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={p.active ? "text-success" : "text-muted-foreground"}>
                      {p.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button aria-label="Edit" variant="ghost" size="icon" onClick={() => setForm({ ...empty, ...p })}>
                      <Edit className="size-4" />
                    </Button>
                    <Button aria-label="Delete" variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit POI" : "New POI"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Google Place ID</Label><Input value={form.place_id ?? ""} onChange={(e) => setForm({ ...form, place_id: e.target.value })} placeholder="ChIJ…" /></div>
              <div className="col-span-2"><Label>Short description</Label><Textarea rows={2} value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
              <div className="col-span-2"><Label>Address label</Label><Input value={form.address_label ?? ""} onChange={(e) => setForm({ ...form, address_label: e.target.value })} /></div>
              <div className="col-span-2"><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <div><Label>Scenic score (0–10)</Label><Input type="number" step="0.1" value={form.scenic_score} onChange={(e) => setForm({ ...form, scenic_score: Number(e.target.value) })} /></div>
              <div><Label>Admin priority</Label><Input type="number" value={form.admin_priority} onChange={(e) => setForm({ ...form, admin_priority: Number(e.target.value) })} /></div>
              <div><Label>Recommended minutes</Label><Input type="number" value={form.recommended_visit_minutes} onChange={(e) => setForm({ ...form, recommended_visit_minutes: Number(e.target.value) })} /></div>
              <div><Label>Min minutes</Label><Input type="number" value={form.minimum_visit_minutes} onChange={(e) => setForm({ ...form, minimum_visit_minutes: Number(e.target.value) })} /></div>
              <div><Label>Max minutes</Label><Input type="number" value={form.maximum_visit_minutes} onChange={(e) => setForm({ ...form, maximum_visit_minutes: Number(e.target.value) })} /></div>
              <div><Label>Stop fee (pence)</Label><Input type="number" value={form.stop_fee_pence} onChange={(e) => setForm({ ...form, stop_fee_pence: Number(e.target.value) })} /></div>
              <div><Label>Parking fee (pence)</Label><Input type="number" value={form.parking_fee_pence} onChange={(e) => setForm({ ...form, parking_fee_pence: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between pt-2"><Label>Featured</Label><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /></div>
              <div className="flex items-center justify-between pt-2"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
