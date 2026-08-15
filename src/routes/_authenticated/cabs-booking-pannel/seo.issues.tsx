import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listSeoIssues, resolveSeoIssue, runSeoQualityAudit } from "@/lib/seo-quality.functions";
import { Loader2, ShieldAlert, AlertTriangle, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/seo/issues")({
  head: () => ({
    meta: [
      { title: "Seo › Issues — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: seo › issues." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SeoIssuesPage,
});

function severityBadge(sev: string) {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    blocker: { icon: ShieldAlert, cls: "bg-destructive/10 text-destructive", label: "Blocker" },
    warning: { icon: AlertTriangle, cls: "bg-warning/10 text-warning", label: "Warning" },
    info: { icon: Info, cls: "bg-info/10 text-info", label: "Info" },
  };
  const cfg = map[sev] ?? map.info;
  const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cfg.cls}`}><Icon className="h-3 w-3" /> {cfg.label}</span>;
}

function SeoIssuesPage() {
  const router = useRouter();
  const runAudit = useServerFn(runSeoQualityAudit);
  const list = useServerFn(listSeoIssues);
  const resolve = useServerFn(resolveSeoIssue);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [pagesScanned, setPagesScanned] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res: any = await list();
      setRows(res.rows);
      setMeta(res);
      return res;
    } catch (e: any) { toast.error(e.message); return null; }
    finally { setLoading(false); }
  }

  async function onAudit(silent = false) {
    setRunning(true);
    try {
      const res = await runAudit({ data: { similarityThreshold: 0.8 } });
      setPagesScanned(res.pages);
      if (!silent) toast.success(`Audit complete — ${res.total} issues (${res.blockers} blockers).`);
      await refresh();
      router.invalidate();
    } catch (e: any) { toast.error(e.message); }
    finally { setRunning(false); }
  }

  // Always show current data: if the stored report predates the latest content
  // edit (or was never generated), re-run the audit automatically on open.
  useEffect(() => {
    let done = false;
    (async () => {
      const res = await refresh();
      if (done) return;
      if (res?.stale) await onAudit(true);
    })();
    return () => { done = true; };
  }, []);

  async function onResolve(id: string) {
    try { await resolve({ data: { id } }); toast.success("Marked resolved."); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SEO Content Quality</h1>
          <p className="text-sm text-muted-foreground">Duplicate content, thin pages, orphans, and metadata issues.</p>
        </div>
        <Button onClick={() => onAudit(false)} disabled={running}>
          {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Auditing…</> : "Run full audit"}
        </Button>
      </div>

      <Card><CardContent className="py-4 text-sm flex flex-wrap gap-x-6 gap-y-2 items-center">
        {pagesScanned !== null && <span><b>{pagesScanned}</b> pages scanned</span>}
        <span className="text-destructive"><b>{meta?.counts?.blockers ?? 0}</b> blockers</span>
        <span className="text-warning"><b>{meta?.counts?.warnings ?? 0}</b> warnings</span>
        <span className="text-info"><b>{meta?.counts?.info ?? 0}</b> info</span>
        <span className="text-muted-foreground">
          {running ? "Refreshing report…"
            : meta?.lastAuditAt
              ? `Last audited ${new Date(meta.lastAuditAt).toLocaleString()}`
              : "Never audited"}
        </span>
        {!running && meta?.stale && (
          <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            <AlertTriangle className="h-3 w-3" /> Content changed since last audit
          </span>
        )}
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Open issues ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading…</div> :
           rows.length === 0 ? <div className="py-8 text-center text-muted-foreground">No open issues. Run the audit to refresh.</div> :
           <div className="divide-y">
             {rows.map((r) => (
               <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                 <div className="min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     {severityBadge(r.severity)}
                     <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs">{r.issue_type}</span>
                     {r.seo_pages?.path && <span className="text-xs text-muted-foreground truncate">{r.seo_pages.path}</span>}
                   </div>
                   <p className="mt-1 text-sm">{r.message}</p>
                   {r.seo_pages?.seo_title && <p className="text-xs text-muted-foreground">{r.seo_pages.seo_title}</p>}
                 </div>
                 <Button size="sm" variant="ghost" onClick={() => onResolve(r.id)}>Resolve</Button>
               </div>
             ))}
           </div>}
        </CardContent>
      </Card>
    </div>
  );
}
