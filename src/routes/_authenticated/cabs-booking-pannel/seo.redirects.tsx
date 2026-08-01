import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSeoRedirects, upsertSeoRedirect, deleteSeoRedirect } from "@/lib/seo-admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/ui";
import { SeoTable } from "@/components/admin/SeoTable";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "seo", "redirects"], queryFn: () => listSeoRedirects() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/seo/redirects")({
  head: () => ({
    meta: [
      { title: "Seo › Redirects — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › redirects." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty: any = { id: undefined, from_path: "/", to_path: "/", status_code: "301", active: true, notes: "" };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertSeoRedirect);
  const del = useServerFn(deleteSeoRedirect);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const clean = { ...form };
      if (!clean.notes) clean.notes = null;
      await upsert({ data: clean });
      toast.success("Saved"); setForm(null);
      await qc.invalidateQueries({ queryKey: ["admin", "seo"] });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this redirect?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); await qc.invalidateQueries({ queryKey: ["admin", "seo"] }); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Redirects" description="301/308 redirects with loop and single-hop chain protection.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-2" />New redirect</Button>
      </PageHeader>

      <SeoTable
        rows={data.rows}
        onEdit={r => setForm({ ...empty, ...r })}
        onDelete={remove}
        cols={[
          { key: "from_path", header: "From", render: r => <code className="text-xs">{(r as any).from_path}</code> },
          { key: "to_path", header: "To", render: r => <code className="text-xs">{(r as any).to_path}</code> },
          { key: "status_code", header: "Code" },
          { key: "hit_count", header: "Hits" },
          { key: "active", header: "Active", render: r => (r as any).active ? "yes" : "no" },
        ]}
      />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit redirect" : "New redirect"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From path" className="col-span-2"><Input placeholder="/old-page" value={form.from_path} onChange={e => setForm({ ...form, from_path: e.target.value })} /></Field>
              <Field label="To path" className="col-span-2"><Input placeholder="/new-page" value={form.to_path} onChange={e => setForm({ ...form, to_path: e.target.value })} /></Field>
              <Field label="Status code">
                <Select value={form.status_code} onValueChange={v => setForm({ ...form, status_code: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="301">301 (permanent)</SelectItem><SelectItem value="308">308 (permanent, preserve method)</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Active"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /></Field>
              <Field label="Notes" className="col-span-2"><Input value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
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
