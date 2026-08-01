import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listCustomers } from "@/lib/admin.functions";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "customers"], queryFn: () => listCustomers() });
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: customers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function Page() {
  const { data } = useSuspenseQuery(opts);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => data.filter((c: any) =>
    !search || [c.name, c.email, c.phone].some((v: string) => (v ?? "").toLowerCase().includes(search.toLowerCase()))
  ), [data, search]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Customers" description="Customers derived from booking history. View bookings, spend and contact info." />
      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} customers</span>
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
    </div>
  );
}
