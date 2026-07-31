import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSeoPages, upsertSeoPage, deleteSeoPage, validateSeoPage } from "@/lib/seo-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable } from "@/components/admin/SeoTable";
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "seo", "pages"], queryFn: () => listSeoPages() });

export const Route = createFileRoute("/_authenticated/admin/seo/pages")({
  head: () => ({
    meta: [
      { title: "Seo › Pages — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › pages." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const PAGE_TYPES = ["regional_hub","location_hub","location_service","airport_hub","airport_transfer","airport_route","city_to_city_route","service","fleet_category","tour","local_guide"];
const ENTITY_TYPES = ["location","airport","tour","port","train_station","service","fleet_category"];
const STATUSES = ["draft","needs_content","needs_review","approved","published","noindex","retired"];

const empty: any = {
  id: undefined, page_type: "location_hub",
  primary_entity_type: "location", primary_entity_id: "",
  secondary_entity_type: null, secondary_entity_id: null,
  service_id: null, vehicle_category: "",
  slug: "", path: "/", seo_title: "", meta_description: "", h1: "",
  short_intro: "", canonical_override: "", robots_status: "index,follow",
  publication_status: "draft", featured_image_url: "", og_image_url: "",
  display_priority: 100, canonical_parent_id: null, booking_cta_config: {},
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  needs_content: "bg-warning/15 text-warning",
  needs_review: "bg-warning/15 text-warning",
  approved: "bg-info/15 text-info",
  published: "bg-success/15 text-success",
  noindex: "bg-muted text-muted-foreground",
  retired: "bg-destructive/15 text-destructive",
};

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoPage);
  const del = useServerFn(deleteSeoPage);
  const validate = useServerFn(validateSeoPage);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<{ blockers: string[]; warnings: string[] } | null>(null);

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      for (const k of ["short_intro","canonical_override","featured_image_url","og_image_url","vehicle_category","canonical_parent_id","secondary_entity_id","service_id"]) if (!clean[k]) clean[k] = null;
      if (!clean.secondary_entity_id) clean.secondary_entity_type = null;
      await upsert({ data: clean });
      toast.success("Saved"); setForm(null); setCheck(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo"] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this page?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo"] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }
  async function runCheck() {
    if (!form?.id) { toast.info("Save the page first to run the quality check."); return; }
    try { const r: any = await validate({ data: { id: form.id } }); setCheck({ blockers: r.blockers, warnings: r.warnings }); }
    catch (e: any) { toast.error(e.message ?? "Check failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="SEO Pages" description="Every programmatic landing page — draft, review or publish, with quality gates.">
        <Button onClick={() => { setCheck(null); setForm({ ...empty }); }}><Plus className="size-4 mr-2" />New page</Button>
      </PageHeader>

      <SeoTable
        rows={data.rows}
        onEdit={r => { setCheck(null); setForm({ ...empty, ...r }); }}
        onDelete={remove}
        cols={[
          { key: "path", header: "Path", render: r => <code className="text-xs">{(r as any).path}</code> },
          { key: "page_type", header: "Type" },
          { key: "seo_title", header: "Title" },
          { key: "publication_status", header: "Status", render: r => <span className={"inline-block px-2 py-0.5 rounded-full text-[11px] font-medium " + (STATUS_STYLES[(r as any).publication_status] ?? "bg-muted")}>{(r as any).publication_status.replace(/_/g, " ")}</span> },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => { if (!o) { setForm(null); setCheck(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit SEO page" : "New SEO page"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Page type">
                <Select value={form.page_type} onValueChange={v => setForm({ ...form, page_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Publication status">
                <Select value={form.publication_status} onValueChange={v => setForm({ ...form, publication_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Primary entity type">
                <Select value={form.primary_entity_type} onValueChange={v => setForm({ ...form, primary_entity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Primary entity ID"><Input value={form.primary_entity_id} onChange={e => setForm({ ...form, primary_entity_id: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Path"><Input placeholder="/locations/edinburgh" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} /></Field>
              <Field label="SEO title (30–60 chars)" className="col-span-2">
                <Input value={form.seo_title} onChange={e => setForm({ ...form, seo_title: e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">{form.seo_title.length}/60</p>
              </Field>
              <Field label="Meta description (90–160 chars)" className="col-span-2">
                <Textarea rows={2} value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">{form.meta_description.length}/160</p>
              </Field>
              <Field label="H1" className="col-span-2"><Input value={form.h1} onChange={e => setForm({ ...form, h1: e.target.value })} /></Field>
              <Field label="Short intro" className="col-span-2"><Textarea rows={3} value={form.short_intro ?? ""} onChange={e => setForm({ ...form, short_intro: e.target.value })} /></Field>
              <Field label="Featured image URL"><Input value={form.featured_image_url ?? ""} onChange={e => setForm({ ...form, featured_image_url: e.target.value })} /></Field>
              <Field label="OG image URL"><Input value={form.og_image_url ?? ""} onChange={e => setForm({ ...form, og_image_url: e.target.value })} /></Field>
              <Field label="Canonical override"><Input value={form.canonical_override ?? ""} onChange={e => setForm({ ...form, canonical_override: e.target.value })} /></Field>
              <Field label="Robots"><Input value={form.robots_status} onChange={e => setForm({ ...form, robots_status: e.target.value })} /></Field>
              <Field label="Display priority"><Input type="number" value={form.display_priority} onChange={e => setForm({ ...form, display_priority: Number(e.target.value) })} /></Field>
              <Field label="Vehicle category (optional)"><Input value={form.vehicle_category ?? ""} onChange={e => setForm({ ...form, vehicle_category: e.target.value })} /></Field>

              {check && (
                <div className="col-span-2 rounded-lg border border-border p-3 space-y-2 bg-muted/40">
                  <p className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Quality check</p>
                  {check.blockers.length === 0 && check.warnings.length === 0 && <p className="text-sm text-success">All checks passed — safe to publish.</p>}
                  {check.blockers.map((b, i) => <p key={i} className="text-sm text-destructive">⛔ {b}</p>)}
                  {check.warnings.map((b, i) => <p key={i} className="text-sm text-warning">⚠ {b}</p>)}
                </div>
              )}

              <div className="col-span-2 flex justify-between gap-2 pt-2">
                <div>
                  <Button variant="outline" onClick={runCheck} disabled={!form.id}><ShieldCheck className="size-4 mr-2" /> Run quality check</Button>
                  {form.id && <Link to={"/admin/seo/pages/$id/sections" as any} params={{ id: form.id } as any} className="ml-2 text-xs text-primary underline">Manage sections →</Link>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setForm(null); setCheck(null); }}>Cancel</Button>
                  <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                </div>
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
