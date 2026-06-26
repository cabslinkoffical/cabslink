import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listBookings, updateBooking, deleteBooking } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Trash2, Eye } from "lucide-react";

const opts = queryOptions({ queryKey: ["admin", "bookings"], queryFn: () => listBookings() });

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: BookingsPage,
});

const STATUSES = ["new", "confirmed", "assigned", "on_way", "completed", "cancelled"] as const;

function BookingsPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: useServerFn(updateBooking),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteBooking),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "bookings"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return data.filter((b: any) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.customer_name?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.phone?.toLowerCase().includes(q) ||
        b.pickup_address?.toLowerCase().includes(q) ||
        b.dropoff_address?.toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter]);

  const active = data.find((b: any) => b.id === openId);

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {data.length} shown</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-64" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Pickup</th>
                <th className="text-left p-3">Vehicle</th>
                <th className="text-left p-3">Pax</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.email}</div>
                  </td>
                  <td className="p-3">
                    <div>{b.pickup_date} <span className="text-muted-foreground">{b.pickup_time}</span></div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{b.pickup_address}</div>
                  </td>
                  <td className="p-3 text-xs">{b.vehicle_type}</td>
                  <td className="p-3">{b.passengers}</td>
                  <td className="p-3">
                    <Select value={b.status} onValueChange={(v) => update.mutate({ data: { id: b.id, patch: { status: v as any } } })}>
                      <SelectTrigger className="h-8 w-32 text-xs capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(b.id)}><Eye className="size-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm("Delete this booking?") && del.mutate({ data: { id: b.id } })}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No bookings match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {active && (
            <>
              <SheetHeader><SheetTitle>{active.customer_name}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                <Field label="Email" value={active.email} />
                <Field label="Phone" value={active.phone} />
                <Field label="Vehicle" value={active.vehicle_type} />
                <Field label="Pickup" value={`${active.pickup_date} ${active.pickup_time}`} />
                <Field label="Pickup address" value={active.pickup_address} />
                <Field label="Dropoff address" value={active.dropoff_address} />
                <Field label="Flight" value={active.flight_number ?? "—"} />
                <Field label="Passengers / Luggage" value={`${active.passengers} pax · ${active.luggage} bags`} />
                <Field label="Extras" value={[active.child_seat && "Child seat", active.meet_greet && "Meet & greet", active.return_journey && "Return"].filter(Boolean).join(", ") || "—"} />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Notes</p>
                  <Textarea
                    className="mt-1"
                    defaultValue={active.notes ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (active.notes ?? "")) {
                        update.mutate({ data: { id: active.id, patch: { notes: e.target.value || null } } });
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
