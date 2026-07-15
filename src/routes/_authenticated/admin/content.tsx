import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listContentBlocks, upsertContentBlock, deleteContentBlock } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "content"], queryFn: () => listContentBlocks() });

export const Route = createFileRoute("/_authenticated/admin/content")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, key: "", title: "", body: "", image_url: "" };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertContentBlock);
  const del = useServerFn(deleteContentBlock);
  const [form, setForm] = useState<any>(null);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "content"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "content"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-foreground">
        <strong>Experimental —</strong> content blocks are stored but not currently rendered on any public page.
        Editing here has no effect on the live site. Hidden from the sidebar.
      </div>
      <PageHeader title="Website Content" description="Editable copy blocks. Not currently wired to public routes.">
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New block</Button>
      </PageHeader>

      {data.length === 0 ? <EmptyState title="No content blocks" /> : (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-3.5" /><code className="font-mono">{c.key}</code></div>
                  {c.title && <div className="font-semibold mt-1">{c.title}</div>}
                  {c.body && <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{c.body}</p>}
                  {c.image_url && <img src={c.image_url} alt="" className="mt-2 h-20 w-full object-cover rounded-md" />}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...c, title: c.title ?? "", body: c.body ?? "", image_url: c.image_url ?? "" })}><Edit className="size-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="size-4 text-red-600" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete content block?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form?.id ? "Edit block" : "New block"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Key * <span className="text-muted-foreground text-xs font-normal">(snake_case)</span></Label><Input className="font-mono" value={form.key} disabled={!!form.id} onChange={e => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></div>
              <div><Label>Title</Label><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Body</Label><Textarea value={form.body ?? ""} onChange={e => setForm({ ...form, body: e.target.value })} rows={8} /></div>
              <div><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
