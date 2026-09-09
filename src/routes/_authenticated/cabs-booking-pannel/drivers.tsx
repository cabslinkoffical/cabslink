import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDrivers, upsertDriver, deleteDriver, listVehiclesAdmin } from "@/lib/admin.functions";
import { createDriverLogin, listDriverLogins, sendDriverPasswordSetup, setDriverLoginPassword, unlinkDriverLogin } from "@/lib/driver-logins.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Mail, Phone, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";
import { PhoneInput } from "@/components/site/PhoneInput";
import { MediaUrlInput } from "@/components/admin/media/MediaPicker";

const opts = queryOptions({ queryKey: ["admin", "drivers"], queryFn: () => listDrivers() });
const loginOpts = queryOptions({
  queryKey: ["admin", "driver-logins"],
  queryFn: () => listDriverLogins() as Promise<Array<{ driver_id: string; user_id: string; email: string | null; confirmed: boolean }>>,
});
const vOpts = queryOptions({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: drivers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

const empty = { id: undefined as string | undefined, full_name: "", email: "", phone: "", address: "", license_number: "", assigned_vehicle_id: null as string | null, status: "active", available: true, photo_url: "", notes: "" };

function Page() {
  const { data: drivers } = useSuspenseQuery(opts);
  const { data: vehicles = [] } = useQuery(vOpts);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertDriver);
  const del = useServerFn(deleteDriver);
  const [form, setForm] = useState<any>(null);
  const [login, setLogin] = useState<any>(null);
  const { data: logins = [] } = useQuery(loginOpts);
  const [view, setView] = useViewMode("drivers", "grid");

  const save = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "drivers"] }); toast.success("Saved"); setForm(null); }, onError: (e: any) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "drivers"] }); toast.success("Deleted"); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-6">
      <PageHeader title="Drivers" description="Manage your driver roster, availability, and vehicle assignments.">
        <ViewToggle mode={view} onChange={setView} />
        <Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add driver</Button>
      </PageHeader>

      {drivers.length === 0 ? <EmptyState title="No drivers yet" action={<Button onClick={() => setForm({ ...empty })}><Plus className="size-4 mr-1" /> Add driver</Button>} /> : (
        <div className={view === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4" : "grid gap-3"}>
          {drivers.map((d: any) => (
            <div key={d.id} className={`border border-border rounded-xl bg-card p-4 ${view === "list" ? "flex flex-wrap items-center gap-4" : ""}`}>
              <div className="flex min-w-[220px] flex-1 items-start gap-3">
                <Avatar className="size-12"><AvatarImage src={d.photo_url ?? undefined} /><AvatarFallback className="bg-primary text-primary-foreground">{d.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{d.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="size-3" /> {d.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="size-3" /> {d.phone ?? "—"}</div>
                </div>
              </div>
              <div className={view === "list" ? "flex gap-2" : "flex gap-2 mt-3"}><StatusBadge status={d.status} />{d.available ? <StatusBadge status="active" color="bg-success/12 text-success" /> : null}</div>
              <div className={`text-xs text-muted-foreground ${view === "list" ? "" : "mt-2"}`}>Vehicle: <span className="text-foreground">{d.vehicle?.name ?? "—"}</span></div>
              <div className="text-xs text-muted-foreground">License: <span className="text-foreground font-mono">{d.license_number ?? "—"}</span></div>
              <div className={view === "list" ? "flex justify-end gap-1" : "flex justify-end gap-1 mt-3 pt-3 border-t border-border"}>
                <Button size="sm" variant="ghost" onClick={() => setLogin(d)}>
                  <KeyRound className="size-3.5 mr-1" /> {logins.some((l) => l.driver_id === d.id) ? "Login" : "Add login"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...empty, ...d })}><Edit className="size-3.5 mr-1" /> Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="size-3.5 mr-1" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete driver?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(d.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit driver" : "Add driver"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><PhoneInput value={form.phone ?? ""} onChange={v => setForm({ ...form, phone: v })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>License number</Label><Input value={form.license_number ?? ""} onChange={e => setForm({ ...form, license_number: e.target.value })} /></div>
              <div>
                <Label>Assigned vehicle</Label>
                <Select value={form.assigned_vehicle_id ?? "none"} onValueChange={v => setForm({ ...form, assigned_vehicle_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active", "inactive", "suspended"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.available} onCheckedChange={v => setForm({ ...form, available: v })} /><Label>Available</Label></div>
              <div className="sm:col-span-2"><Label>Photo</Label><MediaUrlInput folder="people" value={form.photo_url ?? ""} onChange={(url) => setForm({ ...form, photo_url: url })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DriverLoginDialog driver={login} onClose={() => setLogin(null)} />
    </div>
  );
}

function DriverLoginDialog({ driver, onClose }: { driver: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: logins = [] } = useQuery(loginOpts);
  const create = useServerFn(createDriverLogin);
  const setPw = useServerFn(setDriverLoginPassword);
  const sendLink = useServerFn(sendDriverPasswordSetup);
  const unlink = useServerFn(unlinkDriverLogin);

  const record = logins.find((l: any) => l.driver_id === driver?.id);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "drivers"] });
    qc.invalidateQueries({ queryKey: ["admin", "driver-logins"] });
  };

  const run = async (fn: () => Promise<any>, done: string) => {
    setBusy(true);
    try { await fn(); refresh(); toast.success(done); setPassword(""); }
    catch (e: any) { toast.error(e?.message ?? "Something went wrong"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!driver} onOpenChange={(o) => { if (!o) { onClose(); setEmail(""); setPassword(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Driver login — {driver?.full_name}</DialogTitle></DialogHeader>
        {driver && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A driver login lets this driver sign in to the driver panel and see only their own assigned jobs.
              They cannot see prices, other drivers&apos; jobs or any settings.
            </p>

            {record ? (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.email}</p>
                    <p className={record.confirmed ? "text-xs text-primary" : "text-xs text-warning"}>
                      {record.confirmed ? "Login ready" : "Password setup required"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={busy}
                      onClick={() => run(() => sendLink({ data: { driverId: driver.id } }), `Password link sent to ${record.email}`)}>
                      {record.confirmed ? "Email reset link" : "Email setup link"}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" disabled={busy}
                      onClick={() => run(() => unlink({ data: { driverId: driver.id } }), "Login unlinked")}>
                      Unlink
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <Label className="text-xs">Or set a password here (min 10 characters)</Label>
                    <Input type="text" autoComplete="off" value={password} placeholder="New password"
                      onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button size="sm" disabled={busy || password.length < 10}
                    onClick={() => run(() => setPw({ data: { driverId: driver.id, password } }), `Password set for ${record.email}. Share it securely.`)}>
                    Save password
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div>
                  <Label>Driver email</Label>
                  <Input type="email" value={email || driver.email || ""} placeholder="driver@example.com"
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Password (optional — min 10 characters)</Label>
                  <Input type="text" autoComplete="off" value={password} placeholder="Leave blank to email an invite"
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button
                  disabled={busy || !(email || driver.email) || (password.length > 0 && password.length < 10)}
                  onClick={() => run(
                    () => create({ data: { driverId: driver.id, email: (email || driver.email) as string, ...(password ? { password } : {}) } }),
                    password ? "Login created — share the email and password with the driver" : "Invitation email sent to the driver",
                  )}
                >
                  Create login
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
