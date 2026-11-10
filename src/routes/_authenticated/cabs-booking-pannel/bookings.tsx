import { formatTime12 } from "@/lib/time-format";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient, queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateBooking, softDeleteBooking, deleteBooking, regenerateBookingLink } from "@/lib/admin.functions";
import { setBookingStatusFn, listBookingNotifications, retryBookingNotification } from "@/lib/booking.functions";
import { STATUS_META, ADMIN_STATUS_OPTIONS, statusLabel, isStatusLocked, type BookingStatus } from "@/lib/booking-lifecycle";

/**
 * Statuses staff may pick, plus the booking's own status when it is a legacy
 * one, so the dropdown always shows where the booking actually stands.
 */
function statusOptionsFor(current?: string | null): BookingStatus[] {
  const list = [...ADMIN_STATUS_OPTIONS];
  if (current && !list.includes(current as BookingStatus) && current in STATUS_META) {
    list.unshift(current as BookingStatus);
  }
  return list;
}

import { useEffect, useState } from "react";
import { listBookingsPage, countBookingTabs, exportBookings } from "@/lib/admin-bookings.functions";
import { BOOKING_TABS } from "@/lib/admin-bookings";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { Pager, useDebounced } from "@/components/admin/Pager";
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
import { BookingStatusCell } from "@/components/admin/BookingStatusCell";
import { BookingTripDetails } from "@/components/admin/BookingTripDetails";
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

const bookingsPageOpts = (tab: string, q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "bookings", "page", { tab, q, page, pageSize }],
  queryFn: () => listBookingsPage({ data: { tab, q, page, pageSize } }),
  placeholderData: keepPreviousData,
});
const bookingCountsOpts = (q: string) => queryOptions({
  queryKey: ["admin", "bookings", "counts", { q }],
  queryFn: () => countBookingTabs({ data: { q } }),
  placeholderData: keepPreviousData,
});



export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: bookings." },
      { property: "og:title", content: "Bookings — Cabslink Admin" },
      { property: "og:description", content: "Cabslink staff console: bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { tab?: string; view?: "bookings" | "tours" } => ({
    ...(typeof s.tab === "string" && s.tab.length > 0 ? { tab: s.tab } : {}),
    ...(s.view === "tours" ? { view: "tours" as const } : {}),
  }),
  loaderDeps: ({ search }) => ({ tab: search.tab ?? "all", view: search.view ?? "bookings" }),
  loader: ({ context, deps }) => deps.view === "tours" ? undefined : Promise.all([
    context.queryClient.ensureQueryData(bookingsPageOpts(deps.tab, "", 1, DEFAULT_PAGE_SIZE)),
    context.queryClient.ensureQueryData(bookingCountsOpts("")),
  ]).then(() => undefined),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: BookingsPage,
});

const TABS = BOOKING_TABS;

function BookingsPage() {
  const { tab = "all", view = "bookings" } = useSearch({ from: "/_authenticated/cabs-booking-pannel/bookings" });
  const qc = useQueryClient();
  const update = useServerFn(updateBooking);
  const setStatus = useServerFn(setBookingStatusFn);
  const softDel = useServerFn(softDeleteBooking);
  const hardDel = useServerFn(deleteBooking);
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  useEffect(() => { setPage(1); }, [tab, q]);
  const listQ = useQuery(bookingsPageOpts(tab, q, page, pageSize));
  const countsQ = useQuery(bookingCountsOpts(q));
  const filtered: any[] = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;
  const exportFn = useServerFn(exportBookings);
  const [exporting, setExporting] = useState(false);
  async function runExport(everything: boolean) {
    setExporting(true);
    try {
      const rows = await exportFn({ data: { tab, q, everything } });
      downloadCsv(bookingExportFilename(everything || (tab === "all" && !q) ? "all" : `${tab}-view`), bookingsToCsv(rows));
      toast.success(everything ? `Exported all ${rows.length} booking(s)` : `Exported ${rows.length} booking(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }
  const [editing, setEditing] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const patchMut = useMutation({
    mutationFn: (vars: any) => update({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Booking updated"); setEditing(null); setReason(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: BookingStatus; reason?: string | null }) => setStatus({ data: vars }),
    onSuccess: (res: any, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "booking-notifications", vars.id] });
      // Keep the open panel in step with the saved status so locks and actions are current.
      setEditing((e: any) => {
        if (!e || e.id !== vars.id) return e;
        const { _staged_status, ...rest } = e;
        return {
          ...rest,
          status: res?.current ?? vars.status,
          cancellation_reason: ["cancelled", "rejected"].includes(res?.current) ? (vars.reason ?? rest.cancellation_reason) : rest.cancellation_reason,
        };
      });
      setReason("");
      toast.success(res?.changed ? "Status updated" : "Status unchanged");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (vars: any) => softDel({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const hardDelMut = useMutation({
    mutationFn: (id: string) => hardDel({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Booking permanently deleted"); },
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
            : "Live transfer bookings: update status and notify customers. Drivers are allocated in the dispatch panel. Cancelled bookings live in Cancellations & Refunds."
        }
      />


      {view === "tours" ? <TourEnquiries /> : <>

      <Tabs value={tab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 gap-1">
          {TABS.map(t => {
            const count = countsQ.data?.[t.id];
            return (
              <TabsTrigger key={t.id} value={t.id} asChild>
                <Link
                  to="/cabs-booking-pannel/bookings"
                  search={{ tab: t.id }}
                  className="gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {t.label}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{count ?? "…"}</span>
                </Link>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, ref, address…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{total} bookings</span>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={total === 0 || exporting}
            onClick={() => runExport(false)}
          >
            <Download className="size-4 mr-2" />
            Export this view
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={exporting}
            onClick={() => runExport(true)}
          >
            Export all
          </Button>
        </div>
      </div>

      {listQ.isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {(listQ.error as Error)?.message ?? "Could not load bookings."}{" "}
          <Button size="sm" variant="outline" className="ml-2" onClick={() => listQ.refetch()}>Retry</Button>
        </div>
      ) : listQ.isPending ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading bookings…</div>
      ) : filtered.length === 0 ? (
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
                    <td className="px-4 py-3 whitespace-nowrap">{b.pickup_date}<div className="text-xs text-muted-foreground">{formatTime12(b.pickup_time)}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{b.price ? `£${Number(b.price).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <BookingStatusCell status={statusLabel(b.status)} paymentStatus={b.payment_status} locked={!b.deleted_at && isStatusLocked(b.status, b.payment_status)}>
                      {b.deleted_at || isStatusLocked(b.status, b.payment_status) ? (
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
                          <SelectTrigger className="h-7 w-auto min-w-[100px] gap-2 text-xs" aria-label="Change status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusOptionsFor(b.status)
                              .map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}

                          </SelectContent>
                        </Select>
                      )}
                      </BookingStatusCell>
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
      {total > 0 && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          noun="bookings"
          loading={listQ.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
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
                    <Info label="Time" value={formatTime12(editing.pickup_time)} />
                    <Info label="Fare" value={editing.price ? `£${Number(editing.price).toFixed(2)}` : "—"} />
                    <Info label="Passengers" value={String(editing.passengers)} />
                    {editing.distance_miles != null && <Info label="Distance (mi)" value={Number(editing.distance_miles).toFixed(1)} />}
                    {editing.cancellation_reason && <Info label="Cancellation reason" value={editing.cancellation_reason} />}
                    {editing.notes && <Info label="Customer notes" value={editing.notes} />}
                  </div>
                  <div className="pt-3 border-t border-border mt-3">
                    <BookingTripDetails booking={editing as any} />
                  </div>
                </Section>

                <Section title="Status">
                  {isStatusLocked(editing.status, editing.payment_status) ? (
                    <p className="text-xs text-muted-foreground">
                      {editing.status === "completed" || editing.status === "cancelled" || editing.status === "rejected"
                        ? "This booking is final — its status can no longer be changed."
                        : "This booking is paid — its status can no longer be changed."}
                    </p>
                  ) : (
                  <Select value={effectiveStatus ?? "new"} onValueChange={v => setEditing({ ...editing, _staged_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptionsFor(effectiveStatus)
                        .map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}

                    </SelectContent>
                   </Select>
                  )}
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

                <Section title="Payment & notes">
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
                      <Label>Admin notes</Label>
                      <Textarea value={editing.admin_notes ?? ""} onChange={e => setEditing({ ...editing, admin_notes: e.target.value })} rows={3} />
                    </div>
                  </div>
                </Section>

                <RegenerateLink bookingId={editing.id} />

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
                    admin_notes: editing.admin_notes,
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

function RegenerateLink({ bookingId }: { bookingId: string }) {
  const regen = useServerFn(regenerateBookingLink);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Customer booking link">
      <p className="text-xs text-muted-foreground">Create a new private link for this booking. The old link stops working straight away.</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        disabled={busy}
        onClick={async () => {
          if (!confirm("Create a new link? The customer's current link will stop working.")) return;
          setBusy(true);
          try {
            const r = await regen({ data: { bookingId } });
            setLink(window.location.origin + r.path);
            toast.success("New link created");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        New customer link
      </Button>
      {link ? <Input readOnly value={link} className="mt-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} /> : null}
    </Section>
  );
}
