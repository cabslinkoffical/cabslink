import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Search, Lock, Mail, Phone, Plane, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ListError, EmptyState } from "@/components/admin/ui";
import { Pager, useDebounced, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TourLoopMap } from "@/components/site/TourLoopMap";
import { minutesLabel } from "@/lib/tour-quote";
import { CUSTOM_TOUR_STATUSES, CUSTOM_TOUR_STATUS_LABEL, type CustomTourStatus } from "@/lib/custom-tour-requests";
import {
  listCustomTourRequestsPage, getCustomTourRequestDetail, updateCustomTourRequest, addCustomTourRequestNote,
} from "@/lib/custom-tour-requests.functions";

const listOpts = (status: string, q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "custom-tour-requests", { status, q, page, pageSize }],
  queryFn: () => listCustomTourRequestsPage({ data: { status, q, page, pageSize } }),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/custom-tour-requests")({
  head: () => ({
    meta: [
      { title: "Custom tour requests — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: customer-built tour requests." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listOpts("all", "", 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  component: CustomTourRequestsPage,
});

const BADGE: Record<CustomTourStatus, string> = {
  new: "bg-warning/15 text-warning",
  reviewing: "bg-info/15 text-info",
  quoted: "bg-[var(--gold)]/20 text-[var(--navy)]",
  accepted: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

function StatusPill({ s }: { s: CustomTourStatus }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[s] ?? "bg-muted"}`}>{CUSTOM_TOUR_STATUS_LABEL[s] ?? s}</span>;
}

const money = (n: unknown) => (n == null ? "—" : `£${Number(n).toFixed(2)}`);
const ukStamp = (v: string) => new Date(v).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });

function CustomTourRequestsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const term = useDebounced(q.trim());
  const paging = usePageState([status, term]);
  const listQ = useQuery(listOpts(status, term, paging.page, paging.pageSize));
  const rows = (listQ.data?.rows ?? []) as any[];
  const counts = (listQ.data?.counts ?? {}) as Record<string, number>;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Custom tour requests</h1>
          <p className="text-sm text-muted-foreground">
            Customer-built days sent for a personal quote. {counts.all ?? 0} total · {counts.new ?? 0} new
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, name, email, phone" className="w-64 pl-9" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {(["all", ...CUSTOM_TOUR_STATUSES] as string[]).map((k) => {
          const on = status === k;
          return (
            <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setStatus(k)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-[var(--gold)] bg-[var(--gold)] font-semibold text-[var(--navy)]" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
              {k === "all" ? "All" : CUSTOM_TOUR_STATUS_LABEL[k as CustomTourStatus]} <span className="opacity-70">{counts[k] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {listQ.isError ? (
        <ListError error={listQ.error} onRetry={() => listQ.refetch()} />
      ) : rows.length === 0 && !listQ.isLoading ? (
        <EmptyState title="No custom tour requests here" hint={term ? "Try a different search." : "Requests appear when customers send a custom tour for a quote."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Tour date</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{r.reference_code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{r.tour_date} · {r.start_time}<p className="text-xs text-muted-foreground">{Number(r.hours)} h · {r.passengers} pax</p></td>
                  <td className="max-w-[280px] px-4 py-3 text-xs">
                    <span className="line-clamp-2">{r.start_label} → {((r.stops ?? []) as any[]).map((s) => s.name).join(" → ")}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.quoted_total != null ? <span className="font-semibold">{money(r.quoted_total)}</span>
                      : r.estimated_total != null ? <span className="text-muted-foreground">est. {money(r.estimated_total)}</span>
                      : <span className="text-muted-foreground">To quote</span>}
                  </td>
                  <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager
        page={paging.page} pageSize={paging.pageSize} total={listQ.data?.total ?? 0}
        onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} loading={listQ.isFetching} noun="requests"
      />

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {openId && <RequestDetail id={openId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RequestDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getCustomTourRequestDetail);
  const detail = useQuery({ queryKey: ["admin", "custom-tour-request", id], queryFn: () => fetchDetail({ data: { id } }) });
  const r = detail.data?.request;
  const notes = detail.data?.notes ?? [];

  const [status, setStatus] = useState<CustomTourStatus>("new");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [emailIt, setEmailIt] = useState(false);
  const [note, setNote] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);

  useEffect(() => {
    if (!r) return;
    setStatus(r.status);
    setPrice(r.quoted_total != null ? String(Number(r.quoted_total)) : "");
  }, [r?.id, r?.status, r?.quoted_total]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "custom-tour-request", id] });
    qc.invalidateQueries({ queryKey: ["admin", "custom-tour-requests"] });
  };
  const save = useMutation({
    mutationFn: useServerFn(updateCustomTourRequest),
    onSuccess: (res: any) => {
      refresh();
      setMessage("");
      setEmailIt(false);
      if (res?.warning) toast.warning(res.warning); else toast.success("Request updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const addNote = useMutation({
    mutationFn: useServerFn(addCustomTourRequestNote),
    onSuccess: () => { refresh(); setNote(""); setNoteVisible(false); toast.success("Note added"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (detail.isError) return <ListError error={detail.error} onRetry={() => detail.refetch()} />;
  if (!r) return <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading request…</p>;

  const stops = (r.stops ?? []) as any[];
  const original = (r.original_stops ?? null) as any[] | null;
  const priceNum = price.trim() === "" ? null : Number(price);

  return (
    <div className="space-y-6 pb-10">
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{r.reference_code}</span> <StatusPill s={r.status} />
        </SheetTitle>
        <p className="text-xs text-muted-foreground">Received {ukStamp(r.created_at)}</p>
      </SheetHeader>

      <section className="grid gap-2 rounded-2xl border border-border p-4 text-sm sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">{r.customer_name}</p>
        <a href={`mailto:${r.email}`} className="flex items-center gap-2 underline"><Mail className="size-4" /> {r.email}</a>
        <a href={`tel:${r.phone}`} className="flex items-center gap-2 underline"><Phone className="size-4" /> {r.phone}</a>
        {r.flight_number && <p className="flex items-center gap-2"><Plane className="size-4" /> {r.flight_number}</p>}
        <p>{r.tour_date} from {r.start_time} · {Number(r.hours)} hours</p>
        <p>{r.passengers} passengers · {r.luggage} suitcases</p>
        <p>Vehicle: {r.vehicle_name ?? "not chosen (group needs planning)"}</p>
        {r.customer_notes && <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 sm:col-span-2"><span className="font-semibold">Customer notes:</span> {r.customer_notes}</p>}
      </section>

      <section className="space-y-3">
        <h3 className="font-display font-bold">Route</h3>
        <ol className="space-y-1 text-sm">
          <li><span className="font-semibold">Start:</span> {r.start_label}</li>
          {stops.map((s, i) => (
            <li key={i} className="flex items-center gap-2 pl-3">
              {i + 1}. {s.name}
              {s.dwellMinutes ? <span className="text-muted-foreground">· {minutesLabel(s.dwellMinutes)}</span> : null}
              {s.locked ? <Lock className="size-3.5 text-muted-foreground" aria-label="Locked by customer" /> : null}
            </li>
          ))}
          <li><span className="font-semibold">Finish:</span> {r.end_label || r.start_label}</li>
        </ol>
        {original && (
          <p className="text-xs text-muted-foreground">
            Customer's original order (before quickest-order suggestion): {original.map((s: any) => s.name).join(" → ")}
          </p>
        )}
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <Fact label="Road miles" value={r.route_miles != null ? `${Math.round(Number(r.route_miles))} mi` : "Not measured"} />
          <Fact label="Driving time" value={r.drive_minutes != null ? minutesLabel(r.drive_minutes) : "Not measured"} />
          <Fact label="Time at stops" value={r.dwell_minutes != null ? minutesLabel(r.dwell_minutes) : "—"} />
        </div>
        <p className="text-xs text-muted-foreground">Driving time is a road-route estimate and doesn't include traffic or breaks.</p>
        <TourLoopMap
          startPlaceId={r.start_place_id}
          startLabel={r.start_label}
          stops={[...stops.map((s) => ({ placeId: s.placeId, name: s.name })), ...(r.end_place_id && r.end_place_id !== r.start_place_id ? [{ placeId: r.end_place_id, name: r.end_label ?? "Finish" }] : [])]}
          className="h-64 w-full overflow-hidden rounded-2xl"
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h3 className="font-display font-bold">Price and status</h3>
        <p className="text-sm">
          Instant estimate: {r.estimated_total != null ? <strong>{money(r.estimated_total)}</strong> : <span className="text-muted-foreground">none</span>}
          {r.price_note ? <span className="block text-xs text-muted-foreground">Why no instant price: {r.price_note}</span> : null}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ctr-price">Quoted price (£)</Label>
            <Input id="ctr-price" type="number" min={0} step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 450" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CustomTourStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUSTOM_TOUR_STATUSES.map((s) => <SelectItem key={s} value={s}>{CUSTOM_TOUR_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ctr-msg">Message to the customer (optional)</Label>
          <Textarea id="ctr-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Shown on their status page; included in the email if you send one." />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={emailIt} onCheckedChange={(v) => setEmailIt(v === true)} /> Email the customer about this update
        </label>
        <Button
          type="button"
          variant="gold"
          className="rounded-full"
          disabled={save.isPending || (priceNum != null && !(priceNum >= 0))}
          onClick={() => save.mutate({ data: { id, status, quotedTotal: priceNum, message: message.trim() || null, emailCustomer: emailIt } })}
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Save update
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="font-display font-bold">Notes and history</h3>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (call log, vehicle plan, follow-up)…" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={noteVisible} onCheckedChange={(v) => setNoteVisible(v === true)} /> Show this note to the customer
          </label>
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={!note.trim() || addNote.isPending}
            onClick={() => addNote.mutate({ data: { id, body: note.trim(), visibleToCustomer: noteVisible } })}>
            Add note
          </Button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n: any) => (
              <li key={n.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {ukStamp(n.created_at)} {n.author_email ? `· ${n.author_email}` : ""}
                  {n.visible_to_customer
                    ? <span className="flex items-center gap-1 font-semibold text-success"><Eye className="size-3.5" /> Customer can see</span>
                    : <span className="flex items-center gap-1"><EyeOff className="size-3.5" /> Staff only</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
