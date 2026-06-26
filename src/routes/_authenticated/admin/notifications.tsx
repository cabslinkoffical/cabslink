import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotificationTemplates, upsertNotificationTemplate, deleteNotificationTemplate, listNotificationLog, sendTestNotification } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Send, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const tplOpts = queryOptions({ queryKey: ["admin", "notif-tpl"], queryFn: () => listNotificationTemplates() });
const logOpts = queryOptions({ queryKey: ["admin", "notif-log"], queryFn: () => listNotificationLog() });

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(tplOpts), context.queryClient.ensureQueryData(logOpts)]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, key: "", name: "", channel: "email", subject: "", body: "", variables: [] as string[], active: true };

function Page() {
  const { data: templates } = useSuspenseQuery(tplOpts);
  const { data: log } = useSuspenseQuery(logOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertNotificationTemplate);
  const del = useServerFn(deleteNotificationTemplate);
  const sendTest = useServerFn(sendTestNotification);
  const [form, setForm] = useState<any>(null);
  const [test, setTest] = useState<{ key: string; recipient: string } | null>(null);

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "notif-tpl"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "notif-tpl"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });
  const queueTest = useMutation({ mutationFn: (v: { templateKey: string; recipient: string }) => sendTest({ data: v }), onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ["admin", "notif-log"] }); toast.success(r?.note ?? "Queued"); setTest(null); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Notifications" description="Templates and outbound message log. Connect a provider to enable real delivery." />

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="log">Send log ({log.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> New template</Button></div>
          {templates.length === 0 ? <EmptyState title="No templates" /> : (
            <div className="grid lg:grid-cols-2 gap-4">
              {templates.map((t: any) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {t.channel === "email" ? <Mail className="size-4 text-muted-foreground" /> : <MessageSquare className="size-4 text-muted-foreground" />}
                        <span className="font-semibold">{t.name}</span>
                        <StatusBadge status={t.active ? "active" : "inactive"} />
                      </div>
                      <code className="text-xs text-muted-foreground font-mono">{t.key}</code>
                      {t.subject && <div className="text-sm mt-2 truncate">{t.subject}</div>}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                      {t.variables?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.variables.map((v: string) => <code key={v} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setTest({ key: t.key, recipient: "" })} title="Send test"><Send className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setForm({ ...empty, ...t, subject: t.subject ?? "", variables: t.variables ?? [] })}><Edit className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="size-4 text-red-600" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete template?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(t.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          {log.length === 0 ? <EmptyState title="No messages sent yet" /> : (
            <div className="border border-border rounded-xl bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="text-left px-4 py-3">When</th><th className="text-left px-4 py-3">Template</th><th className="text-left px-4 py-3">Channel</th><th className="text-left px-4 py-3">Recipient</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Error</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {log.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{l.template_key ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{l.channel}</td>
                      <td className="px-4 py-3">{l.recipient}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3 text-xs text-red-600">{l.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Key * <span className="text-muted-foreground text-xs">(snake_case)</span></Label><Input className="font-mono" disabled={!!form.id} value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></div>
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              {form.channel === "email" && <div className="col-span-2"><Label>Subject</Label><Input value={form.subject ?? ""} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>}
              <div className="col-span-2"><Label>Body *</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={8} className="font-mono text-xs" /></div>
              <div className="col-span-2"><Label>Variables (comma-separated)</Label><Input value={(form.variables ?? []).join(", ")} onChange={e => setForm({ ...form, variables: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="customer_name, booking_ref" /></div>
              <div className="col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!test} onOpenChange={o => !o && setTest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send test message</DialogTitle></DialogHeader>
          {test && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Template: <code className="font-mono">{test.key}</code></div>
              <div><Label>Recipient (email or phone)</Label><Input value={test.recipient} onChange={e => setTest({ ...test, recipient: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTest(null)}>Cancel</Button><Button onClick={() => queueTest.mutate({ templateKey: test.key, recipient: test.recipient })} disabled={queueTest.isPending || !test.recipient}>Queue test</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
