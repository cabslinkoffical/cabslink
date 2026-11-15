import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Send, Pause, Play, Trash2, Pencil, Mail, Users, Ticket, History, Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import { listCampaigns, saveCampaign, deleteCampaign, sendCampaignTest, sendCampaignNow, listCampaignSends, saveMarketingSettings, saveAutomationRule, deleteAutomationRule, sendRuleTest } from "@/lib/marketing.functions";
import { EMAIL_TEMPLATES, TEMPLATE_KIND_LABELS, TRIGGER_LABELS, TRIGGER_TEMPLATE, TRIGGER_TYPES, TRIGGER_DEFAULT_DAYS, CUSTOM_EVENT_LABELS, campaignWarnings, type TriggerType, type AudienceFilter, type CustomEvent } from "@/lib/email-automation";
import { Switch } from "@/components/ui/switch";
import { describeSchedule, WEEKDAYS, type CampaignFrequency } from "@/lib/campaign-schedule";
import { ukDate } from "@/lib/uk-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmailCalendar } from "@/components/admin/EmailCalendar";
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
type RuleForm = { id?: string; name: string; trigger_type: TriggerType; delay_days: number; subject: string; body: string; coupon_id: string | null; active: boolean; audience_filter: AudienceFilter | null };
const blankRule = (t: TriggerType = "after_trip"): RuleForm => {
  const tpl = EMAIL_TEMPLATES.find((x) => x.id === TRIGGER_TEMPLATE[t])!;
  return { name: tpl.name, trigger_type: t, delay_days: TRIGGER_DEFAULT_DAYS[t], subject: tpl.subject, body: tpl.body, coupon_id: null, active: false, audience_filter: t === "custom" ? { event: "completed_trip", booked: "any" } : null };
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
  const rules = ((q.data as any)?.rules ?? []) as any[];
  const settings = (q.data as any)?.settings ?? { paused: false, daily_cap: 500, quiet_days: 7 };
  const leftToday = (q.data as any)?.leftToday as number | null;
  const [cfg, setCfg] = useState<{ daily_cap: number; quiet_days: number } | null>(null);
  const [rule, setRule] = useState<RuleForm | null>(null);
  const couponOf = (id: string | null) => coupons.find((c) => c.id === id) ?? null;
  const saveCfg = useMutation({ mutationFn: useServerFn(saveMarketingSettings), onSuccess: () => { refresh(); setCfg(null); toast.success("Sending settings saved"); }, onError: (e: any) => toast.error(e.message) });
  const saveRuleM = useMutation({ mutationFn: useServerFn(saveAutomationRule), onSuccess: (r: any) => { refresh(); toast.success("Automatic email saved"); setRule((f) => (f ? { ...f, id: r.id } : f)); }, onError: (e: any) => toast.error(e.message) });
  const delRule = useMutation({ mutationFn: useServerFn(deleteAutomationRule), onSuccess: () => { refresh(); toast.success("Automatic email deleted"); }, onError: (e: any) => toast.error(e.message) });
  const testRule = useMutation({ mutationFn: useServerFn(sendRuleTest), onSuccess: (r: any) => toast.success(`Test email sent to ${r.to}`), onError: (e: any) => toast.error(e.message) });
  const ruleRow = (r: any, patch: Partial<RuleForm> = {}) => ({ data: { id: r.id, name: r.name, trigger_type: r.trigger_type, delay_days: r.delay_days, subject: r.subject, body: r.body, coupon_id: r.coupon_id, active: r.active, audience_filter: r.audience_filter ?? null, ...patch } });

  const [form, setForm] = useState<Form | null>(null);
  const [sendsFor, setSendsFor] = useState<any | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = useMutation({
    mutationFn: useServerFn(saveCampaign),
    onSuccess: (r: any) => { refresh(); toast.success("Campaign saved"); setForm((f) => (f ? { ...f, id: r.id } : f)); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: useServerFn(deleteCampaign), onSuccess: () => { refresh(); toast.success("Campaign deleted"); }, onError: (e: any) => toast.error(e.message) });
  const test = useMutation({ mutationFn: useServerFn(sendCampaignTest), onSuccess: (r: any) => toast.success(`Test email sent to ${r.to}`), onError: (e: any) => toast.error(e.message) });
  const now = useMutation({
    mutationFn: useServerFn(sendCampaignNow),
    onSuccess: (r: any) => { refresh(); toast.success(`Sent to ${r.sent} customer${r.sent === 1 ? "" : "s"}${r.failed ? `, ${r.failed} failed` : ""}${r.remaining ? ` — ${r.remaining} more go out over the next 15 minutes` : ""}`); },
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
      <PageHeader title="Email automation" description="Send coupon, event and offer emails once, on a schedule or automatically. They go to customers who ticked “email me offers” and to past bookers (UK soft opt-in). Every email has an unsubscribe link.">
        <Button variant="outline" asChild><Link to="/cabs-booking-pannel/my-customers"><Users className="size-4" />My Customers</Link></Button>
        <Button variant="gold" onClick={() => setForm(blank())}><Plus className="size-4" />New campaign</Button>
      </PageHeader>

      <div className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${settings.paused ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
        <div className="flex items-center gap-2">
          <Switch id="pause-all" checked={!settings.paused} disabled={saveCfg.isPending}
            onCheckedChange={(on) => { if (on || confirm("Pause all offer emails? Scheduled campaigns and automatic emails stop until you switch this back on.")) saveCfg.mutate({ data: { daily_cap: settings.daily_cap, quiet_days: settings.quiet_days, paused: !on } } as any); }} />
          <Label htmlFor="pause-all" className="font-medium">{settings.paused ? "All offer emails are paused" : "Offer emails are on"}</Label>
        </div>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div><Label htmlFor="cap" className="text-xs">Daily limit</Label><Input id="cap" type="number" min={1} max={10000} className="mt-1 h-8 w-24" value={cfg?.daily_cap ?? settings.daily_cap} onChange={(e) => setCfg({ daily_cap: Number(e.target.value), quiet_days: cfg?.quiet_days ?? settings.quiet_days })} /></div>
          <div><Label htmlFor="quiet" className="text-xs">Days between emails to one person</Label><Input id="quiet" type="number" min={0} max={90} className="mt-1 h-8 w-24" value={cfg?.quiet_days ?? settings.quiet_days} onChange={(e) => setCfg({ quiet_days: Number(e.target.value), daily_cap: cfg?.daily_cap ?? settings.daily_cap })} /></div>
          {cfg && <Button size="sm" variant="outline" disabled={saveCfg.isPending} onClick={() => saveCfg.mutate({ data: { ...cfg, paused: settings.paused } } as any)}>Save</Button>}
          {leftToday != null && <span className="pb-1.5 text-muted-foreground">{leftToday} more can go out today (UK time)</span>}
        </div>
      </div>

      <EmailCalendar />

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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Zap className="size-4" />Automatic emails</h2>
            <p className="text-sm text-muted-foreground">Sent by themselves when something happens, such as a few days after a trip. Each person gets each one once per trip or enquiry. New ones start switched off.</p>
          </div>
          <Button variant="outline" onClick={() => setRule(blankRule())}><Plus className="size-4" />New automatic email</Button>
        </div>
        {rules.length === 0 ? <EmptyState title="No automatic emails yet" hint="Try a thank you with a code three days after each trip, or a come back offer 90 days after someone's last trip." />
          : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Coupon</th><th className="px-4 py-2.5">Sent</th><th className="px-4 py-2.5">On</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-t border-border/70 align-top">
                      <td className="px-4 py-3"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.subject}</div></td>
                      <td className="px-4 py-3 text-xs">{r.trigger_type === "custom" ? `${r.delay_days} days: ${(CUSTOM_EVENT_LABELS[(r.audience_filter?.event ?? "last_contact") as CustomEvent] ?? "").toLowerCase()}` : `${r.delay_days} ${(TRIGGER_LABELS[r.trigger_type as TriggerType] ?? r.trigger_type).toLowerCase()}`}</td>
                      <td className="px-4 py-3 text-xs">{couponOf(r.coupon_id)?.code ?? "None"}</td>
                      <td className="px-4 py-3 text-xs tabular-nums">{r.total_sent}{r.last_run_at ? <div className="text-muted-foreground">checked {when(r.last_run_at)}</div> : null}</td>
                      <td className="px-4 py-3"><Switch checked={r.active} aria-label={`Switch ${r.name} ${r.active ? "off" : "on"}`} onCheckedChange={(on) => saveRuleM.mutate(ruleRow(r, { active: on }) as any)} /></td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setRule({ id: r.id, name: r.name, trigger_type: r.trigger_type, delay_days: r.delay_days, subject: r.subject, body: r.body, coupon_id: r.coupon_id, active: r.active, audience_filter: r.audience_filter ?? null })}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => { if (confirm(`Delete "${r.name}"?`)) delRule.mutate({ data: { id: r.id } } as any); }}><Trash2 className="size-3.5" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <Sheet open={!!rule} onOpenChange={(o) => !o && setRule(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {rule && (
            <>
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Zap className="size-4" />{rule.id ? "Edit automatic email" : "New automatic email"}</SheetTitle></SheetHeader>
              <div className="mt-5 space-y-5">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">When it sends</div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <div>
                      <Label className="text-xs">Trigger</Label>
                      <Select value={rule.trigger_type} onValueChange={(v) => setRule((f) => (f ? { ...f, trigger_type: v as TriggerType, delay_days: TRIGGER_DEFAULT_DAYS[v as TriggerType], audience_filter: v === "custom" ? (f.audience_filter ?? { event: "completed_trip", booked: "any" }) : null } : f))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{TRIGGER_TYPES.map((t) => <SelectItem key={t} value={t}>{TRIGGER_LABELS[t]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label htmlFor="r-days" className="text-xs">Days</Label><Input id="r-days" type="number" min={0} max={730} className="mt-1" value={rule.delay_days} onChange={(e) => setRule((f) => (f ? { ...f, delay_days: Number(e.target.value) } : f))} /></div>
                  </div>
                  {rule.trigger_type === "custom" && <CustomConditions value={rule.audience_filter ?? {}} onChange={(v) => setRule((f) => (f ? { ...f, audience_filter: v } : f))} />}
                  <p className="text-xs text-muted-foreground">{TRIGGER_HELP[rule.trigger_type]} </p>
                  <p className="text-xs text-muted-foreground">Checked every 15 minutes. Only trips or enquiries from the last {rule.delay_days + 14} days count, so switching this on never emails people about very old trips.</p>
                </section>
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Message</div>
                  <TemplatePicker onPick={(id) => { const t = EMAIL_TEMPLATES.find((x) => x.id === id); if (t) setRule((f) => (f ? { ...f, subject: t.subject, body: t.body } : f)); }} />
                  <div><Label htmlFor="r-name" className="text-xs">Name (staff only)</Label><Input id="r-name" className="mt-1" value={rule.name} onChange={(e) => setRule((f) => (f ? { ...f, name: e.target.value } : f))} /></div>
                  <div><Label htmlFor="r-subject" className="text-xs">Email subject</Label><Input id="r-subject" className="mt-1" value={rule.subject} onChange={(e) => setRule((f) => (f ? { ...f, subject: e.target.value } : f))} /></div>
                  <div><Label htmlFor="r-body" className="text-xs">Email text</Label><Textarea id="r-body" className="mt-1" rows={9} value={rule.body} onChange={(e) => setRule((f) => (f ? { ...f, body: e.target.value } : f))} /></div>
                  <div>
                    <Label className="text-xs">Coupon (optional)</Label>
                    <Select value={rule.coupon_id ?? "none"} onValueChange={(v) => setRule((f) => (f ? { ...f, coupon_id: v === "none" ? null : v } : f))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No coupon</SelectItem>
                        {coupons.filter((c) => c.active).map((c) => <SelectItem key={c.id} value={c.id}>{c.code}{c.expires_at ? ` (until ${c.expires_at})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </section>
                {rule.id && (
                  <section className="space-y-2 rounded-lg border border-border p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Send yourself a test</div>
                    <Button variant="outline" disabled={testRule.isPending} onClick={() => testRule.mutate({ data: { id: rule.id! } } as any)}>{testRule.isPending ? "Sending…" : "Send test to me"}</Button>
                    <p className="text-xs text-muted-foreground">Goes only to the admin email in Settings.</p>
                  </section>
                )}
                <Warnings list={campaignWarnings({ subject: rule.subject, body: rule.body, coupon: couponOf(rule.coupon_id) })} />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" disabled={saveRuleM.isPending} onClick={() => saveRuleM.mutate({ data: rule } as any)}>Save{rule.active ? "" : " (switched off)"}</Button>
                  <Button variant="gold" className="flex-1" disabled={saveRuleM.isPending} onClick={() => { saveRuleM.mutate({ data: { ...rule, active: true } } as any); setRule((f) => (f ? { ...f, active: true } : f)); }}><Zap className="size-4" />Save and switch on</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {form && (
            <>
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Mail className="size-4" />{form.id ? "Edit campaign" : "New campaign"}</SheetTitle></SheetHeader>
              <div className="mt-5 space-y-5">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Message</div>
                  <TemplatePicker onPick={(id) => { const t = EMAIL_TEMPLATES.find((x) => x.id === id); if (t) setForm((f) => (f ? { ...f, name: f.name || t.name, subject: t.subject, body: t.body } : f)); }} />
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
                  <p className="text-xs text-muted-foreground">{describeSchedule({ frequency: form.frequency, sendHour: form.send_hour, weekday: form.weekday, monthDay: form.month_day, startsOn: form.starts_on })}. Emails go out within 15 minutes of this time.</p>
                </section>

                {form.id && (
                  <section className="space-y-2 rounded-lg border border-border p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Send yourself a test</div>
                    <Button variant="outline" disabled={test.isPending} onClick={() => test.mutate({ data: { id: form.id! } } as any)}>{test.isPending ? "Sending…" : "Send test to me"}</Button>
                    <p className="text-xs text-muted-foreground">Goes only to the admin email in Settings. Save first: the test uses the saved version.</p>
                  </section>
                )}

                <Warnings list={campaignWarnings({ subject: form.subject, body: form.body, coupon: couponOf(form.coupon_id), audienceSize: sizes[form.audience] })} />
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

const TRIGGER_HELP: Record<TriggerType, string> = {
  after_trip: "Sends this many days after a trip is marked completed.",
  lapsed: "Sends when someone has not travelled for this many days.",
  enquiry_no_booking: "Sends this many days after a form enquiry from someone who never booked.",
  before_trip: "Sends this many days before an upcoming confirmed trip, and never on or after the trip day.",
  anniversary: "Sends once a year on the date of their first booking, plus this many days (0 = on the day).",
  abandoned_quote: "Sends this many days after someone started a booking but did not pay, unless they booked again since.",
  after_cancellation: "Sends this many days after a cancelled booking.",
  custom: "Pick the date to count from and who it applies to. Every condition you set must match.",
};

function CustomConditions({ value, onChange }: { value: AudienceFilter; onChange: (v: AudienceFilter) => void }) {
  const num = (v: string) => (v === "" ? null : Math.max(0, Number(v)));
  return (
    <div className="grid gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label className="text-xs">Count the days from</Label>
        <Select value={value.event ?? "last_contact"} onValueChange={(v) => onChange({ ...value, event: v as CustomEvent })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(CUSTOM_EVENT_LABELS) as CustomEvent[]).map((e) => <SelectItem key={e} value={e}>{CUSTOM_EVENT_LABELS[e]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Has booked</Label>
        <Select value={value.booked ?? "any"} onValueChange={(v) => onChange({ ...value, booked: v as AudienceFilter["booked"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="any">Anyone</SelectItem><SelectItem value="yes">Has booked</SelectItem><SelectItem value="no">Never booked</SelectItem></SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Came from</Label>
        <Select value={value.source ?? "any"} onValueChange={(v) => onChange({ ...value, source: v === "any" ? null : v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any form or booking</SelectItem>
            <SelectItem value="booking">Booking</SelectItem><SelectItem value="tour">Tour</SelectItem><SelectItem value="custom_tour">Custom tour request</SelectItem>
            <SelectItem value="contact">Contact form</SelectItem><SelectItem value="corporate">Corporate enquiry</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Completed trips, at least</Label><Input type="number" min={0} className="mt-1" value={value.min_trips ?? ""} onChange={(e) => onChange({ ...value, min_trips: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Completed trips, at most</Label><Input type="number" min={0} className="mt-1" value={value.max_trips ?? ""} onChange={(e) => onChange({ ...value, max_trips: num(e.target.value) })} /></div>
      <div className="sm:col-span-2"><Label className="text-xs">Has spent at least (£)</Label><Input type="number" min={0} className="mt-1" value={value.min_spend ?? ""} onChange={(e) => onChange({ ...value, min_spend: num(e.target.value) })} /></div>
    </div>
  );
}
