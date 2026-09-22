import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAddresses, upsertAddress, deleteAddress } from "@/lib/admin.functions";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

const opts = queryOptions({ queryKey: ["admin", "addresses"], queryFn: () => listAddresses() });
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/addresses")({
  head: () => ({
    meta: [
      { title: "Addresses — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: addresses." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: AddressesPage,
});

const empty = {
  id: undefined as string | undefined,
  name: "",
  label: "",
  place_id: "",
  comparable_value: "",
  pickup_charge: 0,
  dropoff_charge: 0,
  notes: "",
  active: true,
};

function AddressesPage() {
  const { data: addresses } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertAddress);
  const del = useServerFn(deleteAddress);
  const [form, setForm] = useState<any>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => addresses.filter((a: any) =>
    !search || (a.name + a.comparable_value).toLowerCase().includes(search.toLowerCase())
  ), [addresses, search]);

  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "addresses"] }); toast.success("Saved"); setForm(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "addresses"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Addresses" description="Pickup and dropoff address library with comparable values and surcharges.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add address</Button>
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search addresses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No addresses" hint="Add your first address." />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Address</th>
                <th className="text-left px-4 py-3">Matching</th>
                <th className="text-left px-4 py-3">Pickup £</th>
                <th className="text-left px-4 py-3">Dropoff £</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a: any, i: number) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.place_id
                      ? <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs text-success">Exact place</span>
                      : <span title="Matches any address containing this text" className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">Text: {a.comparable_value || a.name}</span>}
                  </td>
                  <td className="px-4 py-3">£{Number(a.pickup_charge).toFixed(2)}</td>
                  <td className="px-4 py-3">£{Number(a.dropoff_charge).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button aria-label="Edit" size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...a })}><Edit className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button aria-label="Delete" size="icon" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete address?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(a.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit address" : "Add address"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div>
                <Label>Address *</Label>
                <PlaceAutocomplete
                  value={form.place_id ? { placeId: form.place_id, label: form.name || "" } : null}
                  initialText={form.place_id ? undefined : (form.name || "")}
                  onChange={(p: SelectedPlace | null) =>
                    setForm({
                      ...form,
                      place_id: p?.placeId ?? "",
                      name: p?.label ?? "",
                      // A picked place is matched on its Place ID alone, so the
                      // loose text fallback is cleared to keep it exact.
                      comparable_value: p ? "" : (form.comparable_value ?? ""),
                    })
                  }
                  placeholder="Search the exact address, airport or postcode"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.place_id
                    ? "Locked to this exact place — the charges below apply only when a customer picks this same address."
                    : "Pick an address from the suggestions so the charge applies to that place only."}
                </p>
              </div>
              <div><Label>Short label</Label><Input value={form.label ?? ""} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Heathrow T5" /></div>
              {!form.place_id && (
                <div>
                  <Label>Text match (only if you cannot pick a place)</Label>
                  <Input value={form.comparable_value ?? ""} onChange={e => setForm({ ...form, comparable_value: e.target.value })} placeholder="e.g. 'heathrow'" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applies to every address containing this text — far less precise than picking a place.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Pickup charge (£)</Label><Input type="number" step="0.01" value={form.pickup_charge} onChange={e => setForm({ ...form, pickup_charge: Number(e.target.value) })} /></div>
                <div><Label>Dropoff charge (£)</Label><Input type="number" step="0.01" value={form.dropoff_charge} onChange={e => setForm({ ...form, dropoff_charge: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <div className="flex justify-end gap-2">
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
