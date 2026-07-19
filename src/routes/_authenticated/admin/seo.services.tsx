import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSeoServices, upsertSeoService, deleteSeoService } from "@/lib/seo-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable, PublishedPill } from "@/components/admin/SeoTable";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "seo", "services"], queryFn: () => listSeoServices() });

export const Route = createFileRoute("/_authenticated/admin/seo/services")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty: any = {
  id: undefined, name: "", slug: "", short_description: "", full_description: "",
  features: [], eligibility: "", fleet_categories: [], hero_image_url: "",
  legacy_route_path: "", published: false, display_priority: 100,
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoService);
  const del = useServerFn(deleteSeoService);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      for (const k of ["short_description","full_description","eligibility","hero_image_url","legacy_route_path"]) if (!clean[k]) clean[k] = null;
      if (typeof clean.features === "string") clean.features = clean.features.split("\n").map((s: string) => s.trim()).filter(Boolean);
      if (typeof clean.fleet_categories === "string") clean.fleet_categories = clean.fleet_categories.split(",").map((s: string) => s.trim()).filter(Boolean);
      await upsert({ data: clean });
      toast.success("Saved"); setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo"] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo"] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="SEO Services" description="Reusable service entities used across landing pages (airport transfers, executive, corporate, tours…).">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New service</Button>
      </PageHeader>

      <SeoTable
        rows={data.rows}
        onEdit={r => setForm({ ...empty, ...r, features: (r as any).features?.join("\n") ?? "", fleet_categories: (r as any).fleet_categories?.join(", ") ?? "" })}
        onDelete={remove}
        cols={[
          { key: "name", header: "Name" },
          { key: "slug", header: "Slug" },
          { key: "display_priority", header: "Priority" },
          { key: "published", header: "Status", render: r => <PublishedPill on={r.published} /> },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Short description" className="col-span-2"><Textarea rows={2} value={form.short_description ?? ""} onChange={e => setForm({ ...form, short_description: e.target.value })} /></Field>
              <Field label="Full description" className="col-span-2"><Textarea rows={4} value={form.full_description ?? ""} onChange={e => setForm({ ...form, full_description: e.target.value })} /></Field>
              <Field label="Features (one per line)" className="col-span-2"><Textarea rows={3} value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} /></Field>
              <Field label="Fleet categories (comma-separated)" className="col-span-2"><Input value={form.fleet_categories} onChange={e => setForm({ ...form, fleet_categories: e.target.value })} /></Field>
              <Field label="Eligibility" className="col-span-2"><Textarea rows={2} value={form.eligibility ?? ""} onChange={e => setForm({ ...form, eligibility: e.target.value })} /></Field>
              <Field label="Hero image URL"><Input value={form.hero_image_url ?? ""} onChange={e => setForm({ ...form, hero_image_url: e.target.value })} /></Field>
              <Field label="Legacy route path"><Input placeholder="/services/executive" value={form.legacy_route_path ?? ""} onChange={e => setForm({ ...form, legacy_route_path: e.target.value })} /></Field>
              <Field label="Display priority"><Input type="number" value={form.display_priority} onChange={e => setForm({ ...form, display_priority: Number(e.target.value) })} /></Field>
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
