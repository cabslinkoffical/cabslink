import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSeoAirports, upsertSeoAirport, deleteSeoAirport, listSeoLocations } from "@/lib/seo-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable, PublishedPill, useBulkSelection } from "@/components/admin/SeoTable";
import { BulkTools, BulkActionBar } from "@/components/admin/BulkTools";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "seo", "airports"], queryFn: () => listSeoAirports() });
const locsOpts = queryOptions({ queryKey: ["admin", "seo", "locations"], queryFn: () => listSeoLocations() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/seo/airports")({
  head: () => ({
    meta: [
      { title: "Seo › Airports — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › airports." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(opts),
    context.queryClient.ensureQueryData(locsOpts),
  ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty: any = {
  id: undefined, name: "", slug: "", iata_code: "", icao_code: "",
  google_place_id: "", latitude: null, longitude: null, location_id: null,
  terminal_information: "", pickup_instructions: "", dropoff_guidance: "",
  meet_and_greet_details: "", waiting_time_policy: "",
  flight_tracking_available: false, operating_hours_notes: "",
  parking_information: "", accessibility_notes: "", hero_image_url: "",
  published: false, featured: false, display_priority: 100,
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const selection = useBulkSelection(data.rows);
  const { data: locs } = useSuspenseQuery(locsOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoAirport);
  const del = useServerFn(deleteSeoAirport);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      for (const k of ["iata_code","icao_code","google_place_id","location_id","terminal_information","pickup_instructions","dropoff_guidance","meet_and_greet_details","waiting_time_policy","operating_hours_notes","parking_information","accessibility_notes","hero_image_url"]) if (!clean[k]) clean[k] = null;
      for (const k of ["latitude","longitude"]) clean[k] = clean[k] === "" || clean[k] == null ? null : Number(clean[k]);
      await upsert({ data: clean });
      toast.success("Saved"); setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo"] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this airport?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo"] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Airports" description="UK airports with terminal, pickup and meet-and-greet information.">
        <BulkTools entity="seo_airports" onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "seo"] })} />
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New airport</Button>
      </PageHeader>

      <BulkActionBar entity="seo_airports" ids={selection.selected} onClear={selection.clear} onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "seo"] })} />

      <SeoTable
        selection={selection}
        rows={data.rows}
        onEdit={r => setForm({ ...empty, ...r })}
        onDelete={remove}
        cols={[
          { key: "name", header: "Name" },
          { key: "iata_code", header: "IATA" },
          { key: "slug", header: "Slug" },
          { key: "published", header: "Status", render: r => <PublishedPill on={r.published} /> },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit airport" : "New airport"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="IATA (3 letters)"><Input value={form.iata_code ?? ""} maxLength={3} onChange={e => setForm({ ...form, iata_code: e.target.value.toUpperCase() })} /></Field>
              <Field label="ICAO (4 letters)"><Input value={form.icao_code ?? ""} maxLength={4} onChange={e => setForm({ ...form, icao_code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Google Place ID" className="col-span-2"><Input value={form.google_place_id ?? ""} onChange={e => setForm({ ...form, google_place_id: e.target.value })} /></Field>
              <Field label="Location">
                <Select value={form.location_id ?? "none"} onValueChange={v => setForm({ ...form, location_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locs.rows.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Latitude"><Input value={form.latitude ?? ""} onChange={e => setForm({ ...form, latitude: e.target.value })} /></Field>
              <Field label="Longitude"><Input value={form.longitude ?? ""} onChange={e => setForm({ ...form, longitude: e.target.value })} /></Field>
              <Field label="Terminal information" className="col-span-2"><Textarea rows={2} value={form.terminal_information ?? ""} onChange={e => setForm({ ...form, terminal_information: e.target.value })} /></Field>
              <Field label="Pickup instructions" className="col-span-2"><Textarea rows={2} value={form.pickup_instructions ?? ""} onChange={e => setForm({ ...form, pickup_instructions: e.target.value })} /></Field>
              <Field label="Drop-off guidance" className="col-span-2"><Textarea rows={2} value={form.dropoff_guidance ?? ""} onChange={e => setForm({ ...form, dropoff_guidance: e.target.value })} /></Field>
              <Field label="Meet & greet details" className="col-span-2"><Textarea rows={2} value={form.meet_and_greet_details ?? ""} onChange={e => setForm({ ...form, meet_and_greet_details: e.target.value })} /></Field>
              <Field label="Waiting time policy" className="col-span-2"><Textarea rows={2} value={form.waiting_time_policy ?? ""} onChange={e => setForm({ ...form, waiting_time_policy: e.target.value })} /></Field>
              <Field label="Parking information" className="col-span-2"><Textarea rows={2} value={form.parking_information ?? ""} onChange={e => setForm({ ...form, parking_information: e.target.value })} /></Field>
              <Field label="Accessibility notes" className="col-span-2"><Textarea rows={2} value={form.accessibility_notes ?? ""} onChange={e => setForm({ ...form, accessibility_notes: e.target.value })} /></Field>
              <Field label="Hero image URL" className="col-span-2"><Input value={form.hero_image_url ?? ""} onChange={e => setForm({ ...form, hero_image_url: e.target.value })} /></Field>
              <Field label="Flight tracking available"><Switch checked={form.flight_tracking_available} onCheckedChange={v => setForm({ ...form, flight_tracking_available: v })} /></Field>
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
