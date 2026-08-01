import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBookings, updateBooking, softDeleteBooking, deleteBooking, listDrivers } from "@/lib/admin.functions";
import { setBookingStatusFn, listBookingNotifications, retryBookingNotification } from "@/lib/booking.functions";
import { STATUS_META, statusLabel, type BookingStatus } from "@/lib/booking-lifecycle";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Trash2, RotateCcw, Eye, RefreshCw, MailCheck, MailX, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "bookings"], queryFn: () => listBookings() });
const driverOpts = queryOptions({ queryKey: ["admin", "drivers-pick"], queryFn: () => listDrivers() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: bookings." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) ?? "all" }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: BookingsPage,
});

const TABS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Pending" },
  { id: "allocated", label: "Allocated" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "deleted", label: "Deleted" },
];

function matchTab(b: any, tab: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (tab === "deleted") return !!b.deleted_at;
  if (b.deleted_at) return false;
  switch (tab) {
    case "all": return true;
    case "upcoming": return b.pickup_date >= today && !["completed", "cancelled", "rejected"].includes(b.status);
    case "pending": return ["new", "pending_allocation", "awaiting_payment"].includes(b.status);
    case "allocated": return ["assigned", "confirmed"].includes(b.status);
    case "in_progress": return ["in_progress", "on_way", "driver_en_route", "passenger_on_board"].includes(b.status);
    case "completed": return b.status === "completed";
    case "cancelled": return ["cancelled", "rejected"].includes(b.status);
    default: return true;
  }
}

function BookingsPage() {
  const { tab } = useSearch({ from: "/_authenticated/cabs-booking-pannel/bookings" });
  const { data: bookings } = useSuspenseQuery(opts);
  const { data: drivers = [] } = useQuery(driverOpts);
  const qc = useQueryClient();
  const update = useServerFn(updateBooking);
  const setStatus = useServerFn(setBookingStatusFn);
  const softDel = useServerFn(softDeleteBooking);
  const hardDel = useServerFn(deleteBooking);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter((b: any) => matchTab(b, tab) && (!q ||
      [b.customer_name, b.email, b.phone, b.booking_ref, b.pickup_address, b.dropoff_address, b.vehicle_type].some((v: any) => (v ?? "").toLowerCase().includes(q))
    ));
  }, [bookings, tab, search]);

  const patchMut = useMutation({
    mutationFn: (vars: any) => update({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Booking updated"); setEditing(null); setReason(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: BookingStatus; reason?: string | null }) => setStatus({ data: vars }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "booking-notifications", editing?.id] });
      toast.success(res?.changed ? "Status updated" : "Status unchanged");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (vars: any) => softDel({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const hardDelMut = useMutation({
    mutationFn: (id: string) => hardDel({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); toast.success("Booking permanently deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const originalStatus = editing?.status as BookingStatus | undefined;
  const stagedStatus = editing?._staged_status as BookingStatus | undefined;
  const effectiveStatus = stagedStatus ?? originalStatus;
  const needsReason = !!effectiveStatus && ["cancelled", "rejected"].includes(effectiveStatus);
  const statusChanged = stagedStatus && stagedStatus !== originalStatus;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Bookings" description="Manage bookings, assignments, and notifications." />

      <Tabs value={tab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} asChild>
              <a href={`/admin/bookings?tab=${t.id}`} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t.label}</a>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, ref, address…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} bookings</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No bookings match" hint="Try a different filter or search term." />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Ref</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Pickup</th>
                  <th className="text-left px-4 py-3">Dropoff</th>
                  <th className="text-left px-4 py-3">Date / Time</th>
                  <th className="text-left px-4 py-3">Vehicle</th>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{b.booking_ref ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{b.email}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate" title={b.pickup_address}>{b.pickup_address}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate" title={b.dropoff_address}>{b.dropoff_address}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.pickup_date} · {b.pickup_time}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.vehicle_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{b.driver?.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.price ? `£${Number(b.price).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.payment_status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={statusLabel(b.status)} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setReason(""); }} title="View / edit"><Eye className="size-4" /></Button>
                        {b.deleted_at ? (
                          <Button size="icon" variant="ghost" onClick={() => delMut.mutate({ id: b.id, restore: true })} title="Restore"><RotateCcw className="size-4" /></Button>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => delMut.mutate({ id: b.id })} title="Soft delete"><Trash2 className="size-4 text-warning" /></Button>
                        )}
                        {b.deleted_at && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" title="Permanently delete"><Trash2 className="size-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Permanently delete booking?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => hardDelMut.mutate(b.id)} className="bg-destructive hover:bg-destructive">Delete forever</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={o => !o && (setEditing(null), setReason(""))}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle>Booking {editing.booking_ref}</SheetTitle>
                <SheetDescription>{editing.customer_name} · {editing.email} · {editing.phone}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Pickup" value={editing.pickup_address} />
                  <Info label="Dropoff" value={editing.dropoff_address} />
                  <Info label="Date" value={editing.pickup_date} />
                  <Info label="Time" value={editing.pickup_time} />
                  <Info label="Vehicle" value={editing.vehicle_type} />
                  <Info label="Passengers / Luggage" value={`${editing.passengers} / ${editing.luggage}`} />
                  {editing.distance_miles != null && <Info label="Distance (mi)" value={Number(editing.distance_miles).toFixed(1)} />}
                  {editing.flight_number && <Info label="Flight" value={editing.flight_number} />}
                  <Info label="Meet & Greet" value={editing.meet_greet ? "Yes" : "No"} />
                  <Info label="Child seat" value={editing.child_seat ? "Yes" : "No"} />
                  {editing.cancellation_reason && <Info label="Cancellation reason" value={editing.cancellation_reason} />}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={effectiveStatus ?? "new"} onValueChange={v => setEditing({ ...editing, _staged_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_META) as BookingStatus[])
                          .filter(s => STATUS_META[s].adminSelectable)
                          .map(s => <SelectItem key={s} value={s} className="capitalize">{STATUS_META[s].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {needsReason && (
                      <div className="mt-2">
                        <Label className="text-xs">Reason (required — visible to customer)</Label>
                        <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={1000} />
                      </div>
                    )}
                    {statusChanged && (
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={statusMut.isPending || (needsReason && !reason.trim())}
                        onClick={() => statusMut.mutate({ id: editing.id, status: stagedStatus!, reason: reason || null })}
                      >
                        Apply status change
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label>Payment status</Label>
                    <Select value={editing.payment_status} onValueChange={v => setEditing({ ...editing, payment_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["unpaid", "paid", "partial", "refunded", "failed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assign driver</Label>
                    <Select value={editing.driver_id ?? "none"} onValueChange={v => setEditing({ ...editing, driver_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Admin notes</Label>
                    <Textarea value={editing.admin_notes ?? ""} onChange={e => setEditing({ ...editing, admin_notes: e.target.value })} rows={3} />
                  </div>
                  {editing.notes && <Info label="Customer notes" value={editing.notes} />}
                </div>

                <NotificationsPanel bookingId={editing.id} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setEditing(null); setReason(""); }}>Close</Button>
                  <Button
                    disabled={patchMut.isPending}
                    onClick={() => patchMut.mutate({ id: editing.id, patch: {
                      payment_status: editing.payment_status,
                      driver_id: editing.driver_id, admin_notes: editing.admin_notes,
                    } })}
                  >Save other changes</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function NotificationsPanel({ bookingId }: { bookingId: string }) {
  const listFn = useServerFn(listBookingNotifications);
  const retryFn = useServerFn(retryBookingNotification);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "booking-notifications", bookingId],
    queryFn: () => listFn({ data: { bookingId } }),
  });
  const retry = useMutation({
    mutationFn: (logId: string) => retryFn({ data: { logId } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin", "booking-notifications", bookingId] });
      if (res?.providerConfigured === false) toast.warning("Email provider not configured — nothing was sent.");
      else if (res?.alreadySent) toast.info("Already sent");
      else if (res?.ok) toast.success("Retry sent");
      else toast.error("Retry failed");
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <Label>Notifications</Label>
        <span className="text-xs text-muted-foreground">{q.data?.length ?? 0} entries</span>
      </div>
      {q.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
      {q.data?.length === 0 && <div className="text-xs text-muted-foreground">No notifications recorded.</div>}
      <ul className="space-y-2">
        {q.data?.map((n: any) => (
          <li key={n.id} className="flex items-start gap-2 text-xs border border-border rounded-md p-2">
            {n.status === "sent" ? <MailCheck className="size-4 text-success mt-0.5" />
              : n.status === "failed" ? <MailX className="size-4 text-destructive mt-0.5" />
              : <MailWarning className="size-4 text-warning mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{n.notification_type} · {n.recipient_category}</div>
              <div className="text-muted-foreground truncate">{n.recipient} · {n.status} · attempt {n.attempt_count}{n.error_category ? ` · ${n.error_category}` : ""}</div>
            </div>
            {n.status !== "sent" && (
              <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(n.id)} className="gap-1">
                <RefreshCw className="size-3" /> Retry
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
