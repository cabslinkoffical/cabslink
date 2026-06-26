import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listVehiclesAdmin, upsertVehicle, deleteVehicle } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });

export const Route = createFileRoute("/_authenticated/admin/fleet")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: FleetPage,
});

type Vehicle = {
  id?: string;
  name: string;
  category: string;
  image_url: string;
  description: string;
  passengers: number;
  luggage: number;
  hand_luggage: number;
  price_per_hour: number | null;
  display_order: number;
  featured: boolean;
  active: boolean;
};

const blank: Vehicle = {
  name: "", category: "Executive", image_url: "", description: "",
  passengers: 4, luggage: 2, hand_luggage: 2, price_per_hour: null,
  display_order: 0, featured: false, active: true,
};

function FleetPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: useServerFn(upsertVehicle),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicles"] }); qc.invalidateQueries({ queryKey: ["public", "vehicles"] }); toast.success("Saved"); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteVehicle),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "vehicles"] }); qc.invalidateQueries({ queryKey: ["public", "vehicles"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<Vehicle | null>(null);

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Fleet</h1>
          <p className="text-sm text-muted-foreground">{data.length} vehicles · {data.filter((v: any) => v.active).length} active</p>
        </div>
        <Button variant="gold" className="rounded-full" onClick={() => setEditing({ ...blank, display_order: data.length + 1 })}>
          <Plus className="size-4" /> Add vehicle
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.map((v: any) => (
          <div key={v.id} className={`rounded-2xl border bg-card overflow-hidden flex flex-col ${v.featured ? "border-[var(--gold)]" : "border-border"} ${!v.active ? "opacity-60" : ""}`}>
            <div className="relative aspect-[4/3] bg-[var(--surface)] flex items-center justify-center p-3">
              <img src={v.image_url} alt={v.name} className="size-full object-contain" />
              {v.featured && <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-2 py-0.5 text-[10px] font-semibold"><Star className="size-3 fill-current" />Featured</span>}
              {!v.active && <span className="absolute top-2 right-2 rounded-full bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-semibold">Hidden</span>}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <p className="text-[10px] uppercase tracking-wider text-[var(--gold)]">{v.category}</p>
              <h3 className="font-display text-lg font-semibold">{v.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{v.description}</p>
              <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                <span>{v.passengers} pax</span>
                <span>{v.luggage} bags</span>
                <span>#{v.display_order}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => setEditing(v)}><Pencil className="size-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${v.name}?`) && del.mutate({ data: { id: v.id } })}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit vehicle" : "Add vehicle"}</DialogTitle></DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ data: editing as any });
              }}
              className="grid sm:grid-cols-2 gap-4"
            >
              <Field label="Name" className="sm:col-span-2"><Input required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Category"><Input required value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} /></Field>
              <Field label="Image URL"><Input required type="url" value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} /></Field>
              <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Passengers"><Input type="number" min={1} value={editing.passengers} onChange={e => setEditing({ ...editing, passengers: +e.target.value })} /></Field>
              <Field label="Luggage"><Input type="number" min={0} value={editing.luggage} onChange={e => setEditing({ ...editing, luggage: +e.target.value })} /></Field>
              <Field label="Hand luggage"><Input type="number" min={0} value={editing.hand_luggage} onChange={e => setEditing({ ...editing, hand_luggage: +e.target.value })} /></Field>
              <Field label="Display order"><Input type="number" value={editing.display_order} onChange={e => setEditing({ ...editing, display_order: +e.target.value })} /></Field>
              <Field label="Price / hour (optional)"><Input type="number" step="0.01" value={editing.price_per_hour ?? ""} onChange={e => setEditing({ ...editing, price_per_hour: e.target.value ? +e.target.value : null })} /></Field>
              <div className="sm:col-span-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Active</label>
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" variant="gold" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
