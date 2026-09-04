import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMessages, updateMessage, deleteMessage } from "@/lib/admin.functions";
import { isTourEnquiry, tourNameFrom, TOUR_STATUSES, tourStatusLabel } from "@/lib/tour-enquiries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Eye, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, StatusBadge } from "@/components/admin/ui";
import { CannedEmailComposer } from "@/components/admin/CannedEmailComposer";

function tourStatus(m: any): string {
  return m.tour_status ?? "new";
}

/** Tour booking enquiries, managed alongside bookings with a dedicated booking status flow. */
export function TourEnquiries() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "messages"], queryFn: () => listMessages() });
  const upd = useServerFn(updateMessage);
  const del = useServerFn(deleteMessage);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "messages"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };
  const statusMut = useMutation({
    mutationFn: (vars: { id: string; tour_status: string }) => upd({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Enquiry deleted"); setOpenId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const tours = useMemo(() => (data as any[]).filter(isTourEnquiry), [data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((m) =>
      [m.name, m.email, m.phone, m.subject, m.message].some((v: any) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [tours, search]);
  const active = tours.find((m) => m.id === openId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tour enquiries…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {rows.length} tour {rows.length === 1 ? "enquiry" : "enquiries"}
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading tour enquiries…</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No tour enquiries yet" hint="Requests from tour pages will appear here." />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-3"><span className="sr-only">View</span></th>
                  <th className="text-left px-4 py-3">Tour</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Received</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Change status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((m) => (
                  <tr key={m.id} className={`hover:bg-muted/30 ${tourStatus(m) === "new" ? "bg-warning/5" : ""}`}>
                    <td className="px-2 py-3">
                      <Button aria-label="View enquiry" size="icon" variant="ghost" onClick={() => setOpenId(m.id)}><Eye className="size-4" /></Button>
                    </td>
                    <td className="px-4 py-3 max-w-[260px] truncate font-medium" title={tourNameFrom(m)}>{tourNameFrom(m)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={tourStatus(m)} /></td>
                    <td className="px-4 py-3">
                      <Select value={tourStatus(m)} onValueChange={(v) => statusMut.mutate({ id: m.id, tour_status: v })}>
                        <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TOUR_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{tourStatusLabel(s)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button aria-label="Delete enquiry" size="icon" variant="ghost" onClick={() => delMut.mutate(m.id)} title="Delete">
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
              <div className="mt-4 space-y-3 text-sm">
                <p><strong>{active.name}</strong> · {active.email}{active.phone ? ` · ${active.phone}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(active.created_at).toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</span>
                  <Select value={tourStatus(active)} onValueChange={(v) => statusMut.mutate({ id: active.id, tour_status: v })}>
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TOUR_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{tourStatusLabel(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 whitespace-pre-wrap">{active.message}</div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">Send a reply email</p>
                  <CannedEmailComposer
                    scope="message"
                    targetId={active.id}
                    vars={{ name: active.name, ref: active.subject ?? "", reason: "" }}
                    onSent={invalidate}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject ?? "Your tour enquiry")}`}>
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
