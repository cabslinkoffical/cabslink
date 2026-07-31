import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSeoRoutes, upsertSeoRoute, deleteSeoRoute,
  listSeoLocations, listSeoAirports,
} from "@/lib/seo-admin.functions";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable, PublishedPill } from "@/components/admin/SeoTable";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "seo", "routes"], queryFn: () => listSeoRoutes() });
const locsOpts = queryOptions({ queryKey: ["admin", "seo", "locations"], queryFn: () => listSeoLocations() });
const airsOpts = queryOptions({ queryKey: ["admin", "seo", "airports"], queryFn: () => listSeoAirports() });

export const Route = createFileRoute("/_authenticated/admin/seo/routes")({
  head: () => ({
    meta: [
      { title: "Seo › Routes — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › routes." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(opts),
    context.queryClient.ensureQueryData(locsOpts),
    context.queryClient.ensureQueryData(airsOpts),
  ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty: any = {
  id: undefined,
  origin_entity_type: "location", origin_entity_id: "", origin_place_id: "",
  destination_entity_type: "location", destination_entity_id: "", destination_place_id: "",
  slug: "", bidirectional: true,
  applicable_service_ids: [], applicable_vehicle_ids: [],
  operational_status: "planned", published: false, featured: false,
  display_priority: 100, route_notes: "", seasonal_notes: "",
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const { data: locs } = useSuspenseQuery(locsOpts);
  const { data: airs } = useSuspenseQuery(airsOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoRoute);
  const del = useServerFn(deleteSeoRoute);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const entityOptions = useMemo(() => ({
    location: locs.rows.map((r: any) => ({ id: r.id, label: r.name, place_id: r.google_place_id })),
    airport: airs.rows.map((r: any) => ({ id: r.id, label: `${r.name} (${r.iata_code ?? "—"})`, place_id: r.google_place_id })),
  }), [locs, airs]);

  function pickEntity(side: "origin" | "destination", entity_type: string, id: string) {
    const list = (entityOptions as any)[entity_type] ?? [];
    const found = list.find((e: any) => e.id === id);
    setForm({
      ...form,
      [`${side}_entity_type`]: entity_type,
      [`${side}_entity_id`]: id,
      [`${side}_place_id`]: found?.place_id ?? form[`${side}_place_id`],
    });
  }

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      for (const k of ["route_notes","seasonal_notes"]) if (!clean[k]) clean[k] = null;
      await upsert({ data: clean });
      toast.success("Saved"); setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo"] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this route?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo"] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Popular Routes" description="Canonical origin→destination pairs powering city-to-city and airport-route pages.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New route</Button>
      </PageHeader>

      <SeoTable
        rows={data.rows}
        onEdit={r => setForm({ ...empty, ...r })}
        onDelete={remove}
        cols={[
          { key: "slug", header: "Slug" },
          { key: "origin_entity_type", header: "From" },
          { key: "destination_entity_type", header: "To" },
          { key: "operational_status", header: "Coverage" },
          { key: "published", header: "Status", render: r => <PublishedPill on={r.published} /> },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit route" : "New route"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug" className="col-span-2"><Input placeholder="edinburgh-to-glasgow" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field>

              <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Origin</div>
                <Field label="Type">
                  <Select value={form.origin_entity_type} onValueChange={v => pickEntity("origin", v, "")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["location","airport","tour","port","train_station"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Entity">
                  <Select value={form.origin_entity_id || undefined} onValueChange={v => pickEntity("origin", form.origin_entity_type, v)}>
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {((entityOptions as any)[form.origin_entity_type] ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Origin Place ID" className="col-span-2"><Input value={form.origin_place_id ?? ""} onChange={e => setForm({ ...form, origin_place_id: e.target.value })} /></Field>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Destination</div>
                <Field label="Type">
                  <Select value={form.destination_entity_type} onValueChange={v => pickEntity("destination", v, "")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["location","airport","tour","port","train_station"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Entity">
                  <Select value={form.destination_entity_id || undefined} onValueChange={v => pickEntity("destination", form.destination_entity_type, v)}>
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {((entityOptions as any)[form.destination_entity_type] ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Destination Place ID" className="col-span-2"><Input value={form.destination_place_id ?? ""} onChange={e => setForm({ ...form, destination_place_id: e.target.value })} /></Field>
              </div>

              <Field label="Operational status">
                <Select value={form.operational_status} onValueChange={v => setForm({ ...form, operational_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","partner","planned","not_serviced"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Display priority"><Input type="number" value={form.display_priority} onChange={e => setForm({ ...form, display_priority: Number(e.target.value) })} /></Field>
              <Field label="Bidirectional"><Switch checked={form.bidirectional} onCheckedChange={v => setForm({ ...form, bidirectional: v })} /></Field>
              <Field label="Featured"><Switch checked={form.featured} onCheckedChange={v => setForm({ ...form, featured: v })} /></Field>
              <Field label="Published"><Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} /></Field>
              <Field label="Route notes" className="col-span-2"><Textarea rows={2} value={form.route_notes ?? ""} onChange={e => setForm({ ...form, route_notes: e.target.value })} /></Field>
              <Field label="Seasonal notes" className="col-span-2"><Textarea rows={2} value={form.seasonal_notes ?? ""} onChange={e => setForm({ ...form, seasonal_notes: e.target.value })} /></Field>
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
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}
