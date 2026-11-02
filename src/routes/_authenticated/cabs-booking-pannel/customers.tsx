import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { listCustomersPage } from "@/lib/admin-lists.functions";
import { useState } from "react";
import { Pager, useDebounced, usePageState } from "@/components/admin/Pager";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-paging";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/ui";

const custOpts = (q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["admin", "customers", { q, page, pageSize }],
  queryFn: () => listCustomersPage({ data: { q, page, pageSize } }),
  placeholderData: keepPreviousData,
});
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: customers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(custOpts("", 1, DEFAULT_PAGE_SIZE)),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function Page() {
  const [search, setSearch] = useState("");
  const term = useDebounced(search.trim());
  const paging = usePageState(term);
  const listQ = useQuery(custOpts(term, paging.page, paging.pageSize));
  const filtered = (listQ.data?.rows ?? []) as any[];
  const total = listQ.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Customers derived from booking history. View bookings, spend and contact info." />
      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground">{total} customers</span>
      </div>

      {filtered.length === 0 ? <EmptyState title="No customers yet" hint="Customers appear after their first booking." /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Phone</th><th className="text-right px-4 py-3">Bookings</th><th className="text-right px-4 py-3">Total spend</th><th className="text-left px-4 py-3">Last booking</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c: any) => (
                <tr key={c.email} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.bookings}</td>
                  <td className="px-4 py-3 text-right text-primary font-semibold">{fmt(c.spend)}</td>
                  <td className="px-4 py-3">{c.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 0 && (
        <Pager page={paging.page} pageSize={paging.pageSize} total={total} noun="customers" loading={listQ.isFetching}
          onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} />
      )}
    </div>
  );
}
