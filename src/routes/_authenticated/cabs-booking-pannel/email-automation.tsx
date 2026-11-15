import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Send, Pause, Play, Trash2, Pencil, Mail, Users, Ticket, History, Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import { listCampaigns, saveCampaign, deleteCampaign, sendCampaignTest, sendCampaignNow, listCampaignSends, saveMarketingSettings, saveAutomationRule, deleteAutomationRule, sendRuleTest } from "@/lib/marketing.functions";
import { EMAIL_TEMPLATES, TEMPLATE_KIND_LABELS, TRIGGER_LABELS, TRIGGER_TEMPLATE, campaignWarnings, type TriggerType } from "@/lib/email-automation";
import { Switch } from "@/components/ui/switch";
import { describeSchedule, WEEKDAYS, type CampaignFrequency } from "@/lib/campaign-schedule";
import { ukDate } from "@/lib/uk-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, EmptyState, ListError } from "@/components/admin/ui";

const campaignsOpts = queryOptions({ queryKey: ["admin", "campaigns"], queryFn: () => listCampaigns() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/email-automation")({
  head: () => ({
    meta: [
      { title: "Email automation — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: scheduled offer and coupon emails." },
      { property: "og:title", content: "Email automation — Cabslink Admin" },
      { property: "og:description", content: "Cabslink staff console: scheduled offer and coupon emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(campaignsOpts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  component: AutomationPage,
});

type Audience = "all" | "booked" | "not_booked";
type Form = {
  id?: string; name: string; subject: string; body: string; coupon_id: string | null; audience: Audience;
  frequency: CampaignFrequency; send_hour: number; weekday: number; month_day: number; starts_on: string; status: "draft" | "active" | "paused";
};
const AUDIENCE_LABELS: Record<Audience, string> = { all: "Everyone who gets offers", booked: "Customers who have booked", not_booked: "People who enquired but never booked" };
const FREQ_LABELS: Record<CampaignFrequency, string> = { once: "Once", daily: "Daily", weekly: "Weekly", fortnightly: "Every two weeks", monthly: "Monthly" };
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border", active: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/15 text-warning border-warning/30", completed: "bg-info/15 text-info border-info/30",
};
const blank = (): Form => ({
  name: "", subject: "", body: "Hi {{name}},\n\n", coupon_id: null, audience: "all",
  frequency: "once", send_hour: 10, weekday: 1, month_day: 1, starts_on: ukDate(), status: "draft",
});
type RuleForm = { id?: string; name: string; trigger_type: TriggerType; delay_days: number; subject: string; body: string; coupon_id: string | null; active: boolean };
const blankRule = (t: TriggerType = "after_trip"): RuleForm => {
  const tpl = EMAIL_TEMPLATES.find((x) => x.id === TRIGGER_TEMPLATE[t])!;
  return { name: tpl.name, trigger_type: t, delay_days: t === "lapsed" ? 90 : t === "after_trip" ? 3 : 2, subject: tpl.subject, body: tpl.body, coupon_id: null, active: false };
};

function TemplatePicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Start from a ready-made template</Label>
      <Select value="" onValueChange={onPick}>
        <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a template (fills in the subject and text)" /></SelectTrigger>
        <SelectContent>{EMAIL_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{TEMPLATE_KIND_LABELS[t.kind]}: {t.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function Warnings({ list }: { list: string[] }) {
  if (!list.length) return <p className="flex items-center gap-1.5 text-xs text-success"><ShieldCheck className="size-3.5" />Checks passed.</p>;
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="size-3.5" />Check before sending</div>
      <ul className="list-disc space-y-0.5 pl-5">{list.map((w) => <li key={w}>{w}</li>)}</ul>
    </div>
  );
}

const when = (v: string | null) => (v ? new Date(v).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }) : "—");

function AutomationPage() {
  const qc = useQueryClient();
  const q = useQuery(campaignsOpts);
  const campaigns = (q.data?.campaigns ?? []) as any[];
  const coupons = (q.data?.coupons ?? []) as any[];
  const sizes = q.data?.audienceSizes ?? { all: 0, booked: 0, not_booked: 0 };
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });

  const [form, setForm] = useState<Form | null>(null);
  const [testTo, setTestTo] = useState("");
  const [sendsFor, setSendsFor] = useState<any | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = useMutation({
    mutationFn: useServerFn(saveCampaign),
    onSuccess: (r: any) => { refresh(); toast.success("Campaign saved"); setForm((f) => (f ? { ...f, id: r.id } : f)); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: useServerFn(deleteCampaign), onSuccess: () => { refresh(); toast.success("Campaign deleted"); }, onError: (e: any) => toast.error(e.message) });
  const test = useMutation({ mutationFn: useServerFn(sendCampaignTest), onSuccess: () => toast.success("Test email sent"), onError: (e: any) => toast.error(e.message) });
  const now = useMutation({
    mutationFn: useServerFn(sendCampaignNow),
    onSuccess: (r: any) => { refresh(); toast.success(`Sent to ${r.sent} customer${r.sent === 1 ? "" : "s"}${r.failed ? `, ${r.failed} failed` : ""}${r.remaining ? ` — ${r.remaining} more go out within the hour` : ""}`); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendsQ = useQuery({ queryKey: ["admin", "campaign-sends", sendsFor?.id], queryFn: () => listCampaignSends({ data: { id: sendsFor.id } }), enabled: !!sendsFor });

  const payload = (f: Form, status?: Form["status"]) => ({
    data: {
      id: f.id, name: f.name, subject: f.subject, body: f.body, coupon_id: f.coupon_id, audience: f.audience, frequency: f.frequency,
      send_hour: f.send_hour, weekday: f.weekday, month_day: f.month_day, starts_on: f.starts_on || null, status: status ?? f.status,
    },
  });
  const edit = (c: any) => setForm({
    id: c.id, name: c.name, subject: c.subject, body: c.body, coupon_id: c.coupon_id, audience: c.audience, frequency: c.frequency,
    send_hour: c.send_hour, weekday: c.weekday ?? 1, month_day: c.month_day ?? 1, starts_on: c.starts_on ?? "", status: c.status === "completed" ? "draft" : c.status,
  });
  const setStatus = (c: any, status: Form["status"]) => save.mutate({
    data: { id: c.id, name: c.name, subject: c.subject, body: c.body, coupon_id: c.coupon_id, audience: c.audience, frequency: c.frequency,
      send_hour: c.send_hour, weekday: c.weekday, month_day: c.month_day, starts_on: c.starts_on, status },
  } as any);

  return (
    <div className="space-y-6">
      <PageHeader title="Email automation" description="Send coupon and offer emails once or on a schedule. They only go to customers who ticked “email me offers”, and every email has an unsubscribe link.">
        <Button variant="outline" asChild><Link to="/cabs-booking-pannel/my-customers"><Users className="size-4" />My Customers</Link></Button>
        <Button variant="gold" onClick={() => setForm(blank())}><Plus className="size-4" />New campaign</Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
          <div key={a} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{AUDIENCE_LABELS[a]}</div>
            <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{sizes[a]}</div>
          </div>
        ))}
      </div>

      {q.isError ? <ListError error={q.error} onRetry={() => q.refetch()} />
        : campaigns.length === 0 ? <EmptyState title="No campaigns yet" hint="Create one to send a coupon or offer to customers who agreed to hear from you." />
        : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2.5">Campaign</th><th className="px-4 py-2.5">Schedule</th><th className="px-4 py-2.5">Next send</th><th className="px-4 py-2.5">Sent</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border/70 align-top">
                    <td className="px-4 py-3"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.subject}</div><div className="mt-0.5 text-xs text-muted-foreground">{AUDIENCE_LABELS[c.audience as Audience]}</div></td>
                    <td className="px-4 py-3 text-xs">{describeSchedule({ frequency: c.frequency, sendHour: c.send_hour, weekday: c.weekday, monthDay: c.month_day, startsOn: c.starts_on })}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{c.status === "active" ? when(c.next_run_at) : "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{c.total_sent}{c.last_run_at ? <div className="text-muted-foreground">last {when(c.last_run_at)}</div> : null}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[c.status]}`}>{c.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {c.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus(c, "paused")}><Pause className="size-3.5" />Pause</Button>}
                        {(c.status === "paused" || c.status === "draft") && <Button size="sm" variant="outline" onClick={() => setStatus(c, "active")}><Play className="size-3.5" />Start</Button>}
                        {c.status !== "completed" && <Button size="sm" variant="gold" disabled={now.isPending} onClick={() => { if (confirm(`Send "${c.name}" now to ${sizes[c.audience as Audience]} customers?`)) now.mutate({ data: { id: c.id } } as any); }}><Send className="size-3.5" />Send now</Button>}
                        <Button size="sm" variant="ghost" onClick={() => setSendsFor(c)} aria-label="Send history"><History className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => edit(c)} aria-label="Edit"><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${c.name}"?`)) del.mutate({ data: { id: c.id } } as any); }} aria-label="Delete"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {form && (
            <>
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Mail className="size-4" />{form.id ? "Edit campaign" : "New campaign"}</SheetTitle></SheetHeader>
              <div className="mt-5 space-y-5">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Message</div>
                  <div><Label htmlFor="c-name" className="text-xs">Campaign name (staff only)</Label><Input id="c-name" className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Winter airport offer" /></div>
                  <div><Label htmlFor="c-subject" className="text-xs">Email subject</Label><Input id="c-subject" className="mt-1" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="{{name}}, here's {{coupon_offer}} your next transfer" /></div>
                  <div>
                    <Label htmlFor="c-body" className="text-xs">Email text</Label>
                    <Textarea id="c-body" className="mt-1" rows={9} value={form.body} onChange={(e) => set("body", e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">Leave a blank line between paragraphs. You can use {"{{name}}"}, {"{{coupon_code}}"}, {"{{coupon_offer}}"} and {"{{coupon_expiry}}"}. The unsubscribe link and your company details are added automatically.</p>
                  </div>
                  <div>
                    <Label className="text-xs">Coupon (optional)</Label>
                    <Select value={form.coupon_id ?? "none"} onValueChange={(v) => set("coupon_id", v === "none" ? null : v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No coupon</SelectItem>
                        {coupons.filter((c) => c.active).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.code} — {c.discount_type === "percentage" ? `${Number(c.discount_value)}%` : `£${Number(c.discount_value).toFixed(2)}`} off{c.expires_at ? ` (until ${c.expires_at})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">The code is shown in a highlighted box. Manage codes in <Link to="/cabs-booking-pannel/coupons" className="underline">Coupons</Link>.</p>
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Who and when</div>
                  <div>
                    <Label className="text-xs">Send to</Label>
                    <Select value={form.audience} onValueChange={(v) => set("audience", v as Audience)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]} ({sizes[a]})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">How often</Label>
                      <Select value={form.frequency} onValueChange={(v) => set("frequency", v as CampaignFrequency)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(FREQ_LABELS) as CampaignFrequency[]).map((f) => <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Time (UK)</Label>
                      <Select value={String(form.send_hour)} onValueChange={(v) => set("send_hour", Number(v))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 24 }, (_, h) => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {(form.frequency === "weekly" || form.frequency === "fortnightly") && (
                      <div>
                        <Label className="text-xs">Day of the week</Label>
                        <Select value={String(form.weekday)} onValueChange={(v) => set("weekday", Number(v))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {form.frequency === "monthly" && (
                      <div>
                        <Label className="text-xs">Day of the month</Label>
                        <Select value={String(form.month_day)} onValueChange={(v) => set("month_day", Number(v))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 28 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="c-start" className="text-xs">{form.frequency === "once" ? "Send on" : "Start from"}</Label>
                      <Input id="c-start" type="date" className="mt-1" value={form.starts_on} min={ukDate()} onChange={(e) => set("starts_on", e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{describeSchedule({ frequency: form.frequency, sendHour: form.send_hour, weekday: form.weekday, monthDay: form.month_day, startsOn: form.starts_on })}. Emails go out within the hour after this time.</p>
                </section>

                {form.id && (
                  <section className="space-y-2 rounded-lg border border-border p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Send yourself a test</div>
                    <div className="flex gap-2">
                      <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@cabslink.com" />
                      <Button variant="outline" disabled={test.isPending || !testTo} onClick={() => test.mutate({ data: { id: form.id!, to: testTo } } as any)}>{test.isPending ? "Sending…" : "Send test"}</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Save first: the test uses the saved version.</p>
                  </section>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" disabled={save.isPending} onClick={() => save.mutate(payload(form, form.status === "active" ? "active" : "draft") as any)}>Save{form.status === "active" ? " changes" : " as draft"}</Button>
                  <Button variant="gold" className="flex-1" disabled={save.isPending} onClick={() => { save.mutate(payload(form, "active") as any); set("status", "active"); }}><Ticket className="size-4" />Save and schedule</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!sendsFor} onOpenChange={(o) => !o && setSendsFor(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>Sent — {sendsFor?.name}</SheetTitle></SheetHeader>
          <div className="mt-4">
            {sendsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : (sendsQ.data ?? []).length === 0 ? <EmptyState title="Nothing sent yet" hint="Sends appear here once the campaign runs." />
              : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Email</th><th className="py-2">Status</th><th className="py-2">When</th></tr></thead>
                  <tbody>{(sendsQ.data as any[]).map((s) => (
                    <tr key={s.id} className="border-t border-border/70"><td className="py-2">{s.email}</td><td className={`py-2 text-xs ${s.status === "failed" ? "text-destructive" : ""}`} title={s.error ?? ""}>{s.status}</td><td className="py-2 text-xs">{when(s.created_at)}</td></tr>
                  ))}</tbody>
                </table>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
