import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTourEnquiries, setTourEnquiryPrice, type TourEnquiryRow } from "@/lib/tour-admin.functions";
import { setBookingStatusFn } from "@/lib/booking.functions";
import { deleteBooking } from "@/lib/admin.functions";
import { TOUR_STATUSES, tourStatusLabel, tourNameFrom } from "@/lib/tour-enquiries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Eye, Trash2, Mail, BadgePoundSterling } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, StatusBadge } from "@/components/admin/ui";

const FILTERS = ["all", ...TOUR_STATUSES] as const;

function money(n: number | null): string {
  return n == null ? "—" : `£${n.toFixed(2)}`;
}

/**
 * Tour enquiries are bookings (service_type = "private_tour"). Staff add the
 * agreed price here, which confirms the tour and emails the customer a payment
 * link; everything else follows the normal booking lifecycle.
 */
export function TourEnquiries() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<TourEnquiryRow[]>({
    queryKey: ["admin", "tour-enquiries"],
    queryFn: () => listTourEnquiries(),
  });
  const savePrice = useServerFn(setTourEnquiryPrice);
  const setStatus = useServerFn(setBookingStatusFn);
  const del = useServerFn(deleteBooking);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "tour-enquiries"] });
    qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: string; reason?: string }) =>
      setStatus({ data: { id: vars.id, status: vars.status, reason: vars.reason ?? null, override: true } }),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const priceMut = useMutation({
    mutationFn: (vars: { id: string; price: number; note: string; notifyCustomer: boolean }) =>
      savePrice({ data: { id: vars.id, price: vars.price, note: vars.note || null, notifyCustomer: vars.notifyCustomer } }),
    onSuccess: (res: any) => {
      invalidate();
      toast.success(res?.emailed ? "Price saved and emailed to the customer" : "Price saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Tour enquiry deleted"); setOpenId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [notify, setNotify] = useState(true);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!q) return true;
      return [m.booking_ref, m.customer_name, m.email, m.phone, m.tour_name, m.notes].some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      );
    });
  }, [data, search, filter]);

  const active = data.find((m) => m.id === openId) ?? null;

  const openEnquiry = (row: TourEnquiryRow) => {
    setOpenId(row.id);
    setPriceInput(row.price == null ? "" : String(row.price));
    setNoteInput(row.admin_notes ?? "");
    setNotify(true);
  };

  const submitPrice = () => {
    if (!active) return;
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter the agreed total, e.g. 320");
      return;
    }
    priceMut.mutate({ id: active.id, price, note: noteInput, notifyCustomer: notify });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reference, customer or tour…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}>
          <SelectTrigger className="w-[210px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TOUR_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{tourStatusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {rows.length} tour {rows.length === 1 ? "enquiry" : "enquiries"}
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading tour enquiries…</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No tour enquiries yet" hint="Requests from tour pages will appear here with their own reference." />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-3"><span className="sr-only">View</span></th>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Tour</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Start time</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Change status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((m) => (
                  <tr key={m.id} className={`hover:bg-muted/30 ${m.status === "new" ? "bg-warning/5" : ""}`}>
                    <td className="px-2 py-3">
                      <Button aria-label="View tour enquiry" size="icon" variant="ghost" onClick={() => openEnquiry(m)}>
                        <Eye className="size-4" />
                      </Button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{m.booking_ref}</td>
                    <td className="px-4 py-3 max-w-[240px] truncate font-medium" title={tourNameFrom(m)}>{tourNameFrom(m)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{m.pickup_date ? `${m.pickup_date} · ` : ""}{m.pickup_time}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{money(m.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={tourStatusLabel(m.status)} />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {m.payment_status === "paid" ? "Paid" : m.payment_status === "refunded" ? "Refunded" : "Unpaid"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={m.status} onValueChange={(v) => statusMut.mutate({ id: m.id, status: v })}>
                        <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TOUR_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{tourStatusLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button aria-label="Delete tour enquiry" size="icon" variant="ghost" onClick={() => delMut.mutate(m.id)} title="Delete">
                        <Trash2 className="size-4 text-warning" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader><SheetTitle>{tourNameFrom(active)}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                  <p className="font-mono text-base font-bold tracking-wider">{active.booking_ref}</p>
                  <p><strong>{active.customer_name}</strong> · {active.email}{active.phone ? ` · ${active.phone}` : ""}</p>
                  <p>Tour date: {active.pickup_date} at {active.pickup_time}</p>
                  <p>{active.passengers} passengers · {active.luggage} suitcases{active.flight_number ? ` · Flight ${active.flight_number}` : ""}</p>
                  <p className="text-xs text-muted-foreground">Enquired {new Date(active.created_at).toLocaleString()}</p>
                </div>

                {active.tour_stops.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Selected stops</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {active.tour_stops.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {active.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Enquiry details</p>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 whitespace-pre-wrap text-xs">{active.notes}</div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</span>
                  <Select value={active.status} onValueChange={(v) => statusMut.mutate({ id: active.id, status: v })}>
                    <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TOUR_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{tourStatusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Agreed price {active.price_quoted_at ? `· quoted ${new Date(active.price_quoted_at).toLocaleString()}` : ""}
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label htmlFor="tour-price">Total (GBP)</Label>
                      <Input
                        id="tour-price"
                        inputMode="decimal"
                        placeholder="320.00"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                      />
                    </div>
                    <Button onClick={submitPrice} disabled={priceMut.isPending} className="gap-2 rounded-full">
                      <BadgePoundSterling className="size-4" />
                      {priceMut.isPending ? "Saving…" : "Save & confirm"}
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="tour-note">Note for the customer (optional)</Label>
                    <Textarea
                      id="tour-note"
                      rows={3}
                      placeholder="Included: private driver, all entry fees excluded…"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
                    Email the customer the price and a payment link
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Saving a price confirms the tour and moves it to “{tourStatusLabel("awaiting_payment")}”.
                    The customer pays and tracks it on the manage booking page.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a href={`mailto:${active.email}?subject=Your tour ${encodeURIComponent(active.booking_ref)}`}>
                      <Mail className="size-4" /> Open in mail app
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={() => delMut.mutate(active.id)}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
