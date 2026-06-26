import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActivityLogs } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { toast } from "sonner";

const ENTITIES = ["bookings", "vehicles", "drivers", "coupons", "addresses", "payments", "pricing_rules", "hourly_rates", "surcharges", "content_blocks", "site_settings"];

export const Route = createFileRoute("/_authenticated/admin/logs")({
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const [entity, setEntity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const run = useServerFn(listActivityLogs);
  const mut = useMutation({
    mutationFn: () => run({ data: { entity: entity === "all" ? undefined : entity, search: search || undefined, from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to + "T23:59:59").toISOString() : undefined, limit: 200 } }),
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { mut.mutate(); /* eslint-disable-next-line */ }, []);

  const rows = mut.data ?? [];

  function actionColor(a: string) {
    if (a === "insert") return "text-emerald-600";
    if (a === "delete") return "text-red-600";
    return "text-amber-600";
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Activity Logs" description="Every admin action across the system, with before/after diffs." />

      <div className="flex flex-wrap gap-3 items-end p-4 border border-border rounded-xl bg-card">
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="email, entity id, action…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Entity</Label>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Loading…" : "Apply"}</Button>
      </div>

      {rows.length === 0 ? <EmptyState title="No activity in this range" /> : (
        <div className="border border-border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-8"></th>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row: any) => (
                <Fragment key={row.id}>
                  <tr key={row.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <td className="pl-3">{expanded === row.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{row.actor_email ?? <span className="text-muted-foreground">system</span>}</td>
                    <td className={`px-4 py-3 font-medium capitalize ${actionColor(row.action)}`}>{row.action}</td>
                    <td className="px-4 py-3"><code className="text-xs">{row.entity}</code></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{row.entity_id?.slice(0, 8)}…</td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-d`} className="bg-muted/20">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-80 overflow-auto bg-background border border-border rounded-md p-3">{JSON.stringify(row.diff, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
