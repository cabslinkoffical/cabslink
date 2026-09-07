import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
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
import { Search, Trash2, RotateCcw, Eye, RefreshCw, MailCheck, MailX, MailWarning, Download } from "lucide-react";
import { bookingsToCsv, downloadCsv, bookingExportFilename } from "@/lib/booking-export";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { CannedEmailComposer } from "@/components/admin/CannedEmailComposer";
import { TourEnquiries } from "@/components/admin/TourEnquiries";

/** Pre-selects the most likely pre-written email for the booking's status. */
const TEMPLATE_FOR_STATUS: Partial<Record<BookingStatus, string>> = {
  confirmed: "booking_confirmed",
  assigned: "driver_assigned",
  on_way: "on_the_way",
  driver_en_route: "on_the_way",
  awaiting_payment: "payment_reminder",
  completed: "booking_completed",
  cancelled: "booking_cancelled",
  rejected: "booking_cancelled",
};

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
  validateSearch: (s: Record<string, unknown>): { tab?: string; view?: "bookings" | "tours" } => ({
    ...(typeof s.tab === "string" && s.tab.length > 0 ? { tab: s.tab } : {}),
    ...(s.view === "tours" ? { view: "tours" as const } : {}),
  }),
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
  { id: "deleted", label: "Deleted" },
];

function matchTab(b: any, tab: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (tab === "deleted") return !!b.deleted_at;
  if (b.deleted_at) return false;
  // Cancelled and rejected bookings live in Cancellations & Refunds only.
  if (["cancelled", "rejected"].includes(b.status)) return false;
  switch (tab) {
    case "all": return true;
    case "upcoming": return b.pickup_date >= today && !["completed", "cancelled", "rejected"].includes(b.status);
    case "pending": return ["new", "pending_allocation", "awaiting_payment"].includes(b.status);
    case "allocated": return ["assigned", "confirmed"].includes(b.status);
    case "in_progress": return ["in_progress", "on_way", "driver_en_route", "passenger_on_board"].includes(b.status);
    case "completed": return b.status === "completed";
    default: return true;
  }
}

function BookingsPage() {
  const { tab = "all", view = "bookings" } = useSearch({ from: "/_authenticated/cabs-booking-pannel/bookings" });
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
    <div className="space-y-6">
      <PageHeader
        title={view === "tours" ? "Tour Enquiries" : "Transfer Bookings"}
        description={
          view === "tours"
            ? "Custom tour and day-trip enquiries waiting to be quoted, confirmed or closed."
            : "Live transfer bookings: assign drivers, update status and notify customers. Cancelled bookings live in Cancellations & Refunds."
        }
      />


      {view === "tours" ? <TourEnquiries /> : <>

      <Tabs value={tab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} asChild>
              <Link
                to="/cabs-booking-pannel/bookings"
                search={{ tab: t.id }}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, ref, address…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{filtered.length} bookings</span>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => {
              downloadCsv(bookingExportFilename(tab === "all" && !search ? "all" : `${tab}-view`), bookingsToCsv(filtered));
              toast.success(`Exported ${filtered.length} booking(s)`);
            }}
          >
            <Download className="size-4 mr-2" />
            Export this view
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={bookings.length === 0}
            onClick={() => {
              downloadCsv(bookingExportFilename("all"), bookingsToCsv(bookings));
              toast.success(`Exported all ${bookings.length} booking(s)`);
            }}
          >
            Export all
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No bookings match" hint="Try a different filter or search term." />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Journey</th>
                  <th className="text-left px-4 py-3">Date / Time</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3 w-[190px]">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setEditing(b); setReason(""); }}
                        className="text-left group"
                        title="Open details"
                      >
                        <div className="font-medium group-hover:text-primary transition">{b.customer_name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{b.booking_ref ?? "—"}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <div className="truncate" title={b.pickup_address}>{b.pickup_address}</div>
                      <div className="truncate text-xs text-muted-foreground" title={b.dropoff_address}>→ {b.dropoff_address}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.pickup_date}<div className="text-xs text-muted-foreground">{b.pickup_time}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.price ? `£${Number(b.price).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      {b.deleted_at ? (
                        <StatusBadge status={statusLabel(b.status)} />
                      ) : (
                        <Select
                          value={b.status}
                          onValueChange={(v) => {
                            if (["cancelled", "rejected"].includes(v)) {
                              setEditing({ ...b, _staged_status: v });
                              setReason("");
                              toast.info("Add a reason to cancel or reject");
                              return;
                            }
                            statusMut.mutate({ id: b.id, status: v as BookingStatus, reason: null });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs" aria-label="Change status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_META) as BookingStatus[])
                              .filter(s => STATUS_META[s].adminSelectable || s === b.status)
                              .map(s => <SelectItem key={s} value={s} className="capitalize">{STATUS_META[s].label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button aria-label="View details" size="icon" variant="ghost" onClick={() => { setEditing(b); setReason(""); }} title="View / edit"><Eye className="size-4" /></Button>
                        {b.deleted_at ? (
                          <Button aria-label="Restore" size="icon" variant="ghost" onClick={() => delMut.mutate({ id: b.id, restore: true })} title="Restore"><RotateCcw className="size-4" /></Button>
                        ) : (
                          <Button aria-label="Delete" size="icon" variant="ghost" onClick={() => delMut.mutate({ id: b.id })} title="Soft delete"><Trash2 className="size-4 text-warning" /></Button>
                        )}
                        {b.deleted_at && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button aria-label="Delete" size="icon" variant="ghost" title="Permanently delete"><Trash2 className="size-4 text-destructive" /></Button>
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
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          {editing && (
            <>
              <SheetHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{editing.customer_name}</SheetTitle>
                    <SheetDescription className="font-mono text-[11px]">{editing.booking_ref}</SheetDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    <StatusBadge status={statusLabel(editing.status)} />
                    <StatusBadge status={editing.payment_status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <a className="hover:text-primary" href={`mailto:${editing.email}`}>{editing.email}</a>
                  <a className="hover:text-primary" href={`tel:${editing.phone}`}>{editing.phone}</a>
                </div>
              </SheetHeader>

              <div className="space-y-5 px-6 py-5 text-sm">
                <Section title="Journey">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex gap-2">
                      <span className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pickup</div><div className="font-medium">{editing.pickup_address}</div></div>
                    </div>
                    <div className="flex gap-2">
                      <span className="mt-1 size-2 rounded-full bg-foreground/70 shrink-0" />
                      <div className="min-w-0"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Drop-off</div><div className="font-medium">{editing.dropoff_address}</div></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <Info label="Date" value={editing.pickup_date} />
                    <Info label="Time" value={editing.pickup_time} />
                    <Info label="Vehicle" value={editing.vehicle_type} />
                    <Info label="Fare" value={editing.price ? `£${Number(editing.price).toFixed(2)}` : "—"} />
                    <Info label="Passengers" value={String(editing.passengers)} />
                    <Info label="Suitcases / hand bags" value={`${editing.luggage} / ${(editing as { hand_luggage?: number }).hand_luggage ?? 0}`} />
                    {editing.distance_miles != null && <Info label="Distance (mi)" value={Number(editing.distance_miles).toFixed(1)} />}
                    {editing.flight_number && <Info label="Flight" value={editing.flight_number} />}
                    <Info label="Meet & greet" value={editing.meet_greet ? "Yes" : "No"} />
                    <Info label="Child seat" value={editing.child_seat ? "Yes" : "No"} />
                    {editing.cancellation_reason && <Info label="Cancellation reason" value={editing.cancellation_reason} />}
                    {editing.notes && <Info label="Customer notes" value={editing.notes} />}
                  </div>
                </Section>

                <Section title="Status">
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
                </Section>

                <Section title="Payment & driver">
                  <div className="space-y-3">
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
                  </div>
                </Section>

                <Section title="Tell the customer">
                  <CannedEmailComposer
                    scope="booking"
                    targetId={editing.id}
                    defaultTemplateId={TEMPLATE_FOR_STATUS[editing.status as BookingStatus]}
                    vars={{
                      name: editing.customer_name,
                      ref: editing.booking_ref,
                      pickup: editing.pickup_address,
                      dropoff: editing.dropoff_address,
                      date: editing.pickup_date,
                      time: editing.pickup_time,
                      vehicle: editing.vehicle_type,
                      reason: editing.cancellation_reason ?? "",
                    }}
                    onSent={() => qc.invalidateQueries({ queryKey: ["admin", "booking-notifications", editing.id] })}
                  />
                </Section>

                <NotificationsPanel bookingId={editing.id} />
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card/95 backdrop-blur px-6 py-3">
                <Button variant="outline" onClick={() => { setEditing(null); setReason(""); }}>Close</Button>
                <Button
                  disabled={patchMut.isPending}
                  onClick={() => patchMut.mutate({ id: editing.id, patch: {
                    payment_status: editing.payment_status,
                    driver_id: editing.driver_id, admin_notes: editing.admin_notes,
                  } })}
                >Save changes</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      </>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{title}</p>
      {children}
    </section>
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
