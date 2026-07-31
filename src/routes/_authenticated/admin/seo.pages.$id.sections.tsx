import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSeoPageSections, upsertSeoPageSection, deleteSeoPageSection } from "@/lib/seo-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable } from "@/components/admin/SeoTable";
import { Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const SECTION_TYPES = ["hero","intro","service_overview","local_travel_info","airport_pickup_instructions","route_overview","route_facts","fleet_recommendations","popular_destinations","nearby_airports","nearby_cities","relevant_services","relevant_tours","booking_cta","faqs","local_landmarks","corporate_travel_info","accessibility","custom_rich_text"];

export const Route = createFileRoute("/_authenticated/admin/seo/pages/$id/sections")({
  head: () => ({
    meta: [
      { title: "Seo › Pages › Sections — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › pages › sections." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(
    queryOptions({ queryKey: ["admin", "seo", "sections", params.id], queryFn: () => listSeoPageSections({ data: { page_id: params.id } }) })
  ),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const opts = queryOptions({ queryKey: ["admin", "seo", "sections", id], queryFn: () => listSeoPageSections({ data: { page_id: id } }) });
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoPageSection);
  const del = useServerFn(deleteSeoPageSection);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const empty = { id: undefined, page_id: id, section_type: "intro", position: data.rows.length, heading: "", body: "", structured_payload: {}, visible: true };

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      if (!clean.heading) clean.heading = null;
      if (!clean.body) clean.body = null;
      await upsert({ data: clean });
      toast.success("Saved"); setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo", "sections", id] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(sid: string) {
    if (!confirm("Delete this section?")) return;
    try { await del({ data: { id: sid } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo", "sections", id] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <Link to="/admin/seo/pages" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Back to pages</Link>
      <PageHeader title="Page sections" description="Structured content blocks rendered on the public page in order.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New section</Button>
      </PageHeader>

      <SeoTable
        rows={data.rows}
        onEdit={r => setForm({ ...empty, ...r })}
        onDelete={remove}
        cols={[
          { key: "position", header: "#" },
          { key: "section_type", header: "Type" },
          { key: "heading", header: "Heading" },
          { key: "visible", header: "Visible", render: r => (r as any).visible ? "yes" : "no" },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit section" : "New section"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={form.section_type} onValueChange={v => setForm({ ...form, section_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SECTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Position"><Input type="number" value={form.position} onChange={e => setForm({ ...form, position: Number(e.target.value) })} /></Field>
              <Field label="Heading" className="col-span-2"><Input value={form.heading ?? ""} onChange={e => setForm({ ...form, heading: e.target.value })} /></Field>
              <Field label="Body (markdown/plain)" className="col-span-2"><Textarea rows={6} value={form.body ?? ""} onChange={e => setForm({ ...form, body: e.target.value })} /></Field>
              <Field label="Visible"><Switch checked={form.visible} onCheckedChange={v => setForm({ ...form, visible: v })} /></Field>
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
