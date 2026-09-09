import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Eye, EyeOff, Plus, RefreshCw, Send, Trash2, RotateCcw, KeyRound } from "lucide-react";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import {
  deleteDispatchEndpoint,
  grantDispatchAccess,
  listDispatchEndpoints,
  listDispatchEvents,
  listDispatchUsers,
  retryDispatchEvent,
  revokeDispatchAccess,
  rotateDispatchSecret,
  runDispatchDelivery,
  saveDispatchEndpoint,
  sendDispatchTest,
  sendDispatchPasswordSetup,
  setDispatchPassword,
} from "@/lib/dispatch.functions";

function Chip({ tone = "muted", children }: { tone?: "muted" | "ok" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-primary/10 text-primary"
      : tone === "bad"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

type DispatchTab = "connections" | "people" | "activity";
const TABS: DispatchTab[] = ["connections", "people", "activity"];

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/dispatch")({
  component: DispatchPage,
  validateSearch: (search: Record<string, unknown>): { tab?: DispatchTab } => {
    const t = String(search?.tab ?? "");
    return TABS.includes(t as DispatchTab) ? { tab: t as DispatchTab } : {};
  },
  head: () => ({
    meta: [
      { title: "Dispatch link | CabsLink admin" },
      { name: "description", content: "Connect a separate driver dispatch system to CabsLink bookings." },
    ],
  }),
});

function DispatchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<DispatchTab>(search.tab ?? "connections");
  const qc = useQueryClient();
  const fetchEndpoints = useServerFn(listDispatchEndpoints);
  const fetchEvents = useServerFn(listDispatchEvents);
  const fetchUsers = useServerFn(listDispatchUsers);
  const save = useServerFn(saveDispatchEndpoint);
  const remove = useServerFn(deleteDispatchEndpoint);
  const rotate = useServerFn(rotateDispatchSecret);
  const test = useServerFn(sendDispatchTest);
  const retry = useServerFn(retryDispatchEvent);
  const runNow = useServerFn(runDispatchDelivery);
  const grant = useServerFn(grantDispatchAccess);
  const revoke = useServerFn(revokeDispatchAccess);
  const sendPasswordSetup = useServerFn(sendDispatchPasswordSetup);
  const setPassword = useServerFn(setDispatchPassword);

  const endpoints = useQuery({ queryKey: ["dispatch-endpoints"], queryFn: () => fetchEndpoints() });
  const events = useQuery({ queryKey: ["dispatch-events"], queryFn: () => fetchEvents(), refetchInterval: 20000 });
  const users = useQuery({ queryKey: ["dispatch-users"], queryFn: () => fetchUsers() });

  const [name, setName] = useState("Dispatch panel");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [pw, setPw] = useState<Record<string, string>>({});

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dispatch-endpoints"] });
    qc.invalidateQueries({ queryKey: ["dispatch-events"] });
  };

  const addEndpoint = useMutation({
    mutationFn: () => save({ data: { name, url, active: true } }),
    onSuccess: () => { setUrl(""); invalidate(); toast.success("Dispatch connection saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dispatch link</h1>
          <p className="text-sm text-muted-foreground">
            Connect your separate dispatch site so it receives every booking automatically and can assign drivers.
          </p>
        </div>
        <Button variant="outline" onClick={async () => { const r: any = await runNow({}); invalidate(); toast.success(`Sent ${r.delivered} of ${r.processed}`); }}>
          <RefreshCw className="mr-1.5 size-4" /> Send queued now
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = (TABS.includes(v as DispatchTab) ? v : "connections") as DispatchTab;
          setTab(next);
          void navigate({ search: { tab: next }, replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="people">Dispatch logins</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Add a dispatch system</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div>
                <Label>Notification address (https)</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://dispatch.example.com/api/cabslink" />
              </div>
              <Button onClick={() => addEndpoint.mutate()} disabled={!url || addEndpoint.isPending}>
                <Plus className="mr-1.5 size-4" /> Add
              </Button>
            </CardContent>
          </Card>

          {(endpoints.data ?? []).map((ep: any) => (
            <Card key={ep.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{ep.name}</p>
                    <p className="break-all text-sm text-muted-foreground">{ep.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ep.last_delivery_at ? (
                      <Chip tone={ep.last_delivery_ok ? "ok" : "bad"}>
                        {ep.last_delivery_ok ? "Last send OK" : "Last send failed"}
                      </Chip>
                    ) : <Chip>Never used</Chip>}
                    <div className="flex items-center gap-1.5 text-sm">
                      <Switch
                        checked={ep.active}
                        onCheckedChange={async (v) => { await save({ data: { id: ep.id, name: ep.name, url: ep.url, active: v } }); invalidate(); }}
                      />
                      Active
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Signing key — paste this into your dispatch system</Label>
                  <div className="flex gap-2">
                    <Input readOnly type={shown[ep.id] ? "text" : "password"} value={ep.secret} />
                    <Button variant="outline" size="icon" onClick={() => setShown((s) => ({ ...s, [ep.id]: !s[ep.id] }))}>
                      {shown[ep.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copy(ep.secret)}><Copy className="size-4" /></Button>
                  </div>
                </div>

                {ep.last_error ? <p className="text-sm text-destructive">Last error: {ep.last_error}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={async () => { const r: any = await test({ data: { id: ep.id } }); invalidate(); r.delivered ? toast.success("Test received by your dispatch system") : toast.error("Test could not be delivered — check Activity"); }}>
                    <Send className="mr-1.5 size-4" /> Send test
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => { await rotate({ data: { id: ep.id } }); invalidate(); toast.success("New signing key created"); }}>
                    <RotateCcw className="mr-1.5 size-4" /> New signing key
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { await remove({ data: { id: ep.id } }); invalidate(); }}>
                    <Trash2 className="mr-1.5 size-4" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="people" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Give the dispatch team access</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A dispatch login can see live bookings and drivers, assign a driver and move a job through its stages.
                It cannot change prices, customer details or settings.
              </p>
              <div className="flex gap-2">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dispatcher@example.com" />
                <Button
                  onClick={async () => {
                    try {
                      const r: any = await grant({ data: { email } });
                      setEmail("");
                      qc.invalidateQueries({ queryKey: ["dispatch-users"] });
                      toast.success(r.invited ? "Invitation email sent" : "Dispatch access granted");
                    } catch (e: any) { toast.error(e?.message ?? "Could not grant access"); }
                  }}
                  disabled={!email}
                >
                  Grant access
                </Button>
              </div>
              <div className="divide-y rounded-xl border border-border">
                {(users.data ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No dispatch logins yet.</p>
                ) : (users.data ?? []).map((u: any) => (
                  <div key={u.id} className="space-y-2 p-3 text-sm">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0">
                        <span className="block truncate">{u.email}</span>
                        <span className={u.confirmed ? "text-xs text-primary" : "text-xs text-warning"}>{u.confirmed ? "Login ready" : "Password setup required"}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            await sendPasswordSetup({ data: { userId: u.user_id } });
                            toast.success(`Password setup sent to ${u.email}`);
                          } catch (e: any) { toast.error(e?.message ?? "Could not send password setup"); }
                        }}>
                          <KeyRound className="mr-1.5 size-4" /> {u.confirmed ? "Email reset link" : "Email setup link"}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { await revoke({ data: { id: u.id } }); qc.invalidateQueries({ queryKey: ["dispatch-users"] }); }}>
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[220px] flex-1">
                        <Label className="text-xs">Or set a password here (min 10 characters)</Label>
                        <Input
                          type="text"
                          value={pw[u.user_id] ?? ""}
                          onChange={(e) => setPw((s) => ({ ...s, [u.user_id]: e.target.value }))}
                          placeholder="New password"
                          autoComplete="off"
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={(pw[u.user_id] ?? "").length < 10}
                        onClick={async () => {
                          try {
                            await setPassword({ data: { userId: u.user_id, password: pw[u.user_id] ?? "" } });
                            setPw((s) => ({ ...s, [u.user_id]: "" }));
                            qc.invalidateQueries({ queryKey: ["dispatch-users"] });
                            toast.success(`Password set for ${u.email}. Share it securely.`);
                          } catch (e: any) { toast.error(e?.message ?? "Could not set the password"); }
                        }}
                      >
                        Save password
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent events sent</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {(events.data ?? []).length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Nothing sent yet.</p>
              ) : (events.data ?? []).map((ev: any) => (
                <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{ev.event_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("en-GB")} · attempts {ev.attempts}
                      {ev.last_error ? ` · ${ev.last_error}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone={ev.status === "delivered" ? "ok" : ev.status === "failed" ? "bad" : "muted"}>
                      {ev.status}
                    </Chip>
                    {ev.status !== "delivered" ? (
                      <Button variant="outline" size="sm" onClick={async () => { await retry({ data: { id: ev.id } }); invalidate(); }}>Retry</Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
