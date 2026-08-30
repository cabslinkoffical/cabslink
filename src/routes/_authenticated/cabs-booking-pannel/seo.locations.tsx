import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSeoLocations, upsertSeoLocation, deleteSeoLocation } from "@/lib/seo-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable, PublishedPill, useBulkSelection } from "@/components/admin/SeoTable";
import { BulkTools, BulkActionBar } from "@/components/admin/BulkTools";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "seo", "locations"], queryFn: () => listSeoLocations() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/seo/locations")({
  head: () => ({
    meta: [
      { title: "Seo › Locations — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › locations." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty: any = {
  id: undefined, name: "", slug: "", location_type: "city", parent_id: null,
  country_code: "GB", nation: "", region: "", county: "",
  admin_area_1: "", admin_area_2: "", google_place_id: "",
  latitude: null, longitude: null, postcode_area: "",
  operational_status: "planned", service_area_status: "planned",
  published: false, featured: false, display_priority: 100,
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const selection = useBulkSelection(data.rows);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoLocation);
  const del = useServerFn(deleteSeoLocation);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      for (const k of ["parent_id", "google_place_id", "postcode_area", "nation", "region", "county", "admin_area_1", "admin_area_2"]) if (!clean[k]) clean[k] = null;
      for (const k of ["latitude", "longitude"]) clean[k] = clean[k] === "" || clean[k] == null ? null : Number(clean[k]);
      await upsert({ data: clean });
      toast.success("Saved");
      setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo"] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this location?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo"] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Locations" description="UK countries, regions, counties, cities and towns used across the SEO system.">
        <BulkTools entity="seo_locations" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "seo"] })} />
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New location</Button>
      </PageHeader>

      <BulkActionBar entity="seo_locations" ids={selection.selected} onClear={selection.clear} onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "seo"] })} />

      <SeoTable
        selection={selection}
        rows={data.rows}
        onEdit={r => setForm({ ...empty, ...r })}
        onDelete={remove}
        cols={[
          { key: "name", header: "Name" },
          { key: "slug", header: "Slug" },
          { key: "location_type", header: "Type" },
          { key: "operational_status", header: "Coverage" },
          { key: "published", header: "Status", render: r => <PublishedPill on={r.published} /> },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit location" : "New location"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Type">
                <Select value={form.location_type} onValueChange={v => setForm({ ...form, location_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["country","nation","region","county","city","town","district"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Country code"><Input value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })} /></Field>
              <Field label="Nation"><Input value={form.nation ?? ""} onChange={e => setForm({ ...form, nation: e.target.value })} /></Field>
              <Field label="Region"><Input value={form.region ?? ""} onChange={e => setForm({ ...form, region: e.target.value })} /></Field>
              <Field label="County"><Input value={form.county ?? ""} onChange={e => setForm({ ...form, county: e.target.value })} /></Field>
              <Field label="Postcode area"><Input value={form.postcode_area ?? ""} onChange={e => setForm({ ...form, postcode_area: e.target.value })} /></Field>
              <Field label="Google Place ID" className="col-span-2"><Input value={form.google_place_id ?? ""} onChange={e => setForm({ ...form, google_place_id: e.target.value })} /></Field>
              <Field label="Latitude"><Input value={form.latitude ?? ""} onChange={e => setForm({ ...form, latitude: e.target.value })} /></Field>
              <Field label="Longitude"><Input value={form.longitude ?? ""} onChange={e => setForm({ ...form, longitude: e.target.value })} /></Field>
              <Field label="Operational status">
                <Select value={form.operational_status} onValueChange={v => setForm({ ...form, operational_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","partner","planned","not_serviced"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Service area status">
                <Select value={form.service_area_status} onValueChange={v => setForm({ ...form, service_area_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","partner","planned","not_serviced"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Display priority"><Input type="number" value={form.display_priority} onChange={e => setForm({ ...form, display_priority: Number(e.target.value) })} /></Field>
              <Field label="Featured"><Switch checked={form.featured} onCheckedChange={v => setForm({ ...form, featured: v })} /></Field>
              <Field label="Published"><Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} /></Field>
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
