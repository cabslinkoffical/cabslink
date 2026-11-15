import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Download, Mail, Phone, Users, MailCheck, MailX, CalendarCheck, Send } from "lucide-react";
import { listMyCustomers, exportMyCustomers, optOutCustomer } from "@/lib/marketing.functions";
import { customersCsv, SOURCE_LABELS, type MyCustomer } from "@/lib/my-customers";
import { Pager, useDebounced, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, EmptyState, ListError } from "@/components/admin/ui";

type Consent = "all" | "subscribed" | "unsubscribed" | "no_consent";
type Kind = "all" | "booked" | "enquiry_only";

const opts = (q: string, consent: Consent, kind: Kind, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "my-customers", { q, consent, kind, page, pageSize }],
  queryFn: () => listMyCustomers({ data: { q, consent, kind, page, pageSize } }),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/my-customers")({
  head: () => ({
    meta: [
      { title: "My Customers — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: every customer who booked or contacted us." },
      { property: "og:title", content: "My Customers — Cabslink Admin" },
      { property: "og:description", content: "Cabslink staff console: every customer who booked or contacted us." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts("", "all", "all", 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  component: MyCustomersPage,
});

const money = (n: number) => `£${n.toFixed(2)}`;
const day = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

function ConsentBadge({ c }: { c: MyCustomer["consent"] }) {
  const cls = c === "subscribed" ? "bg-success/15 text-success border-success/30" : c === "unsubscribed" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{c === "subscribed" ? "Gets offers" : c === "unsubscribed" ? "Unsubscribed" : "No consent"}</span>;
}

function MyCustomersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [consent, setConsent] = useState<Consent>("all");
  const [kind, setKind] = useState<Kind>("all");
  const term = useDebounced(q.trim());
  const paging = usePageState([term, consent, kind]);
  const listQ = useQuery(opts(term, consent, kind, paging.page, paging.pageSize));
  const rows = (listQ.data?.rows ?? []) as MyCustomer[];
  const summary = listQ.data?.summary;
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const active = rows.find((r) => r.email === openEmail) ?? null;

  const exportFn = useServerFn(exportMyCustomers);
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    setExporting(true);
    try {
      const all = await exportFn({ data: { q: term, consent, kind } });
      const blob = new Blob(["\ufeff" + customersCsv(all as MyCustomer[])], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `cabslink-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Exported ${all.length} customers`);
    } catch (e: any) { toast.error(e.message ?? "Export failed"); }
    finally { setExporting(false); }
  };

  const optOut = useMutation({
    mutationFn: useServerFn(optOutCustomer),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "my-customers"] }); toast.success("Offer emails stopped for this customer"); },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = [
    { label: "Customers", value: summary?.total ?? 0, icon: Users },
    { label: "Have booked", value: summary?.booked ?? 0, icon: CalendarCheck },
    { label: "Get offers", value: summary?.subscribed ?? 0, icon: MailCheck },
    { label: "Unsubscribed", value: summary?.unsubscribed ?? 0, icon: MailX },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Customers" description="Everyone who booked or filled in a form on your website, one row per email. Drivers are never included.">
        <Button variant="outline" onClick={doExport} disabled={exporting}><Download className="size-4" />{exporting ? "Exporting…" : "Export CSV"}</Button>
        <Button variant="navy" asChild><Link to="/cabs-booking-pannel/email-automation"><Send className="size-4" />Email automation</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Icon className="size-3.5 text-gold-ink" />{label}</div>
            <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" className="pl-9" />
          </div>
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="booked">Have booked</SelectItem>
              <SelectItem value="enquiry_only">Enquiries only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={consent} onValueChange={(v) => setConsent(v as Consent)}>
            <SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any offer consent</SelectItem>
              <SelectItem value="subscribed">Get offers</SelectItem>
              <SelectItem value="no_consent">No consent</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {listQ.isError ? <div className="p-6"><ListError error={listQ.error} onRetry={() => listQ.refetch()} /></div>
          : rows.length === 0 ? <div className="p-6"><EmptyState title="No customers found" hint="Try clearing the search or filters." /></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">Bookings</th>
                    <th className="px-4 py-2.5">Paid</th>
                    <th className="px-4 py-2.5">How they found us</th>
                    <th className="px-4 py-2.5">Last contact</th>
                    <th className="px-4 py-2.5">Offers</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.email} className="cursor-pointer border-t border-border/70 hover:bg-muted/40" onClick={() => setOpenEmail(c.email)}>
                      <td className="px-4 py-3"><div className="font-medium">{c.name ?? "—"}</div><div className="text-xs text-muted-foreground">{c.email}</div></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{c.bookings}{c.enquiries ? <span className="text-xs text-muted-foreground"> · {c.enquiries} enquir{c.enquiries === 1 ? "y" : "ies"}</span> : null}</td>
                      <td className="px-4 py-3 tabular-nums">{money(c.spend)}</td>
                      <td className="max-w-[14rem] px-4 py-3 text-xs text-muted-foreground">{c.sources.map((s) => SOURCE_LABELS[s]).join(", ")}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{day(c.lastSeen)}</td>
                      <td className="px-4 py-3"><ConsentBadge c={c.consent} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {(listQ.data?.total ?? 0) > 0 && (
          <div className="border-t border-border p-3">
            <Pager page={paging.page} pageSize={paging.pageSize} total={listQ.data?.total ?? 0} noun="customers" loading={listQ.isFetching}
              onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} className="border-0 bg-transparent px-0 py-0" />
          </div>
        )}
      </section>

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenEmail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {active && (
            <>
              <SheetHeader><SheetTitle>{active.name ?? active.email}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="space-y-1.5 rounded-lg border border-border p-4">
                  <a href={`mailto:${active.email}`} className="flex items-center gap-2 underline"><Mail className="size-4" />{active.email}</a>
                  {active.phone && <a href={`tel:${active.phone}`} className="flex items-center gap-2 underline"><Phone className="size-4" />{active.phone}</a>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Bookings", active.bookings], ["Completed", active.completedBookings], ["Cancelled", active.cancelledBookings],
                    ["Enquiries", active.enquiries], ["Paid", money(active.spend)], ["Last pickup", active.lastPickup ?? "—"],
                    ["First seen", day(active.firstSeen)], ["Last contact", day(active.lastSeen)],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="rounded-lg border border-border p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</div><div className="mt-1 font-medium">{v}</div></div>
                  ))}
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">How they found us</div>
                  <div className="mt-1">{active.sources.map((s) => SOURCE_LABELS[s]).join(", ")}</div>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wide text-muted-foreground">Offer emails</span><ConsentBadge c={active.consent} /></div>
                  {active.consent === "subscribed" && <p className="text-xs text-muted-foreground">Agreed on {day(active.optedInAt)}.</p>}
                  {active.consent === "no_consent" && <p className="text-xs text-muted-foreground">This customer hasn't agreed to offer emails, so campaigns won't reach them. Only they can opt in, by ticking the box on a form.</p>}
                  {active.consent === "subscribed" && (
                    <Button variant="outline" size="sm" disabled={optOut.isPending} onClick={() => optOut.mutate({ data: { email: active.email } } as any)}>Stop offer emails</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
