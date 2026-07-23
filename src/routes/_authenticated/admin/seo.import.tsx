import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Lightweight local table primitives — project has no shadcn Table component.
const Table = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <table className={`w-full text-sm ${className}`}>{children}</table>;
const TableHeader = ({ children }: { children: React.ReactNode }) => <thead className="bg-muted/50">{children}</thead>;
const TableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>;
const TableRow = ({ children }: { children: React.ReactNode }) => <tr className="border-b last:border-0">{children}</tr>;
const TableHead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <th className={`text-left px-3 py-2 text-xs font-medium text-muted-foreground ${className}`}>{children}</th>;
const TableCell = ({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) => <td className={`px-3 py-2 align-top ${className}`} title={title}>{children}</td>;

import { UploadCloud, Play, CheckCircle2, AlertTriangle, Loader2, Download, RefreshCw, Sliders } from "lucide-react";
import { parseImportFile, reportToCsv, type ParseResult } from "@/lib/seo/import-parser";
import { IMPORT_KINDS, DEFAULT_RULESET, type ImportKind, type ImportRuleset } from "@/lib/seo/import-schema";
import { validateImport, commitImport, computeAutoRelationships, getImportRuleset, updateImportRuleset, type ValidationOutcome, type CommitReport } from "@/lib/seo/import.functions";

export const Route = createFileRoute("/_authenticated/admin/seo/import")({
  component: SeoImportPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
});

function SeoImportPage() {
  const [kind, setKind] = useState<ImportKind>("town");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [validation, setValidation] = useState<{ outcomes: ValidationOutcome[]; summary: Record<string, number> } | null>(null);
  const [commitReport, setCommitReport] = useState<CommitReport | null>(null);
  const [parsing, setParsing] = useState(false);

  const rulesetQuery = useQuery<ImportRuleset>({
    queryKey: ["seo", "import-ruleset"],
    queryFn: () => getImportRuleset(),
    initialData: DEFAULT_RULESET,
  });
  const [ruleset, setRuleset] = useState<ImportRuleset>(DEFAULT_RULESET);
  useMemo(() => { if (rulesetQuery.data) setRuleset(rulesetQuery.data); }, [rulesetQuery.data]);

  const saveRules = useMutation({
    mutationFn: (r: ImportRuleset) => updateImportRuleset({ data: r }),
    onSuccess: () => toast.success("Ruleset saved"),
    onError: (e: unknown) => toast.error((e as Error).message ?? "Save failed"),
  });

  const validateMut = useMutation({
    mutationFn: async () => {
      if (!parseResult) throw new Error("Load a file first.");
      return validateImport({ data: { kind, rows: parseResult.rows } });
    },
    onSuccess: (r) => { setValidation(r); setCommitReport(null); toast.success(`Validated ${parseResult?.rows.length ?? 0} rows`); },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Validation failed"),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      if (!parseResult) throw new Error("Load a file first.");
      return commitImport({ data: { kind, rows: parseResult.rows } });
    },
    onSuccess: (r) => { setCommitReport(r); toast.success(`Imported: ${r.inserted} new, ${r.updated} updated`); },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Import failed"),
  });

  const autoRel = useMutation({
    mutationFn: () => computeAutoRelationships({ data: { scope: "all" } }),
    onSuccess: (r) => toast.success(`Nearby ${r.nearby} · airport ${r.nearestAirport} · station ${r.nearestStation} · hospital ${r.nearestHospital} · university ${r.nearestUniversity}`),
    onError: (e: unknown) => toast.error((e as Error).message ?? "Compute failed"),
  });

  async function onFile(f: File | null) {
    if (!f) return;
    setParsing(true);
    setValidation(null);
    setCommitReport(null);
    try {
      const r = await parseImportFile(f);
      setParseResult(r);
      toast.success(`Parsed ${r.rows.length} rows from ${r.source.toUpperCase()}${r.sheetName ? ` (${r.sheetName})` : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  }

  async function downloadReport() {
    if (!validation) return;
    const blob = await reportToCsv(
      validation.outcomes.map((o) => ({
        row: o.index + 1, kind: o.kind, key: o.key, status: o.status,
        errors: o.errors.join(" | "), warnings: o.warnings.join(" | "),
      })),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seo-import-validation-${kind}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const preview = parseResult?.rows.slice(0, 5) ?? [];
  const previewCols = preview.length ? Object.keys(preview[0]).slice(0, 8) : [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="SEO Data Import"
        description="Universal import pipeline for destinations, keywords, tags, search intents and relationships. Validates before writing. Nothing becomes indexable until you promote it in the Publishing engine."
      >
        <Button variant="outline" onClick={() => autoRel.mutate()} disabled={autoRel.isPending} className="gap-2">
          {autoRel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Recompute auto-relationships
        </Button>
      </PageHeader>

      {/* Ruleset */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Sliders className="h-4 w-4" /> Classification ruleset</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Default tier</Label>
            <Select value={String(ruleset.defaultTier)} onValueChange={(v) => setRuleset({ ...ruleset, defaultTier: Number(v) as 1|2|3|4 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Tier 4 (Draft, safest)</SelectItem>
                <SelectItem value="3">Tier 3 (Hub)</SelectItem>
                <SelectItem value="2">Tier 2 (Cluster)</SelectItem>
                <SelectItem value="1">Tier 1 (Indexable — requires page)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nearby radius (miles)</Label>
            <Input type="number" min={0} max={200} value={ruleset.nearbyRadiusMiles}
              onChange={(e) => setRuleset({ ...ruleset, nearbyRadiusMiles: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Max nearby per entity</Label>
            <Input type="number" min={0} max={50} value={ruleset.nearbyMaxPerEntity}
              onChange={(e) => setRuleset({ ...ruleset, nearbyMaxPerEntity: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={ruleset.autoNoindex} onCheckedChange={(v) => setRuleset({ ...ruleset, autoNoindex: v })} />
            <Label className="!m-0">Force noindex on import</Label>
          </div>
          <div className="md:col-span-4">
            <Button size="sm" onClick={() => saveRules.mutate(ruleset)} disabled={saveRules.isPending}>
              {saveRules.isPending ? "Saving…" : "Save ruleset"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Load data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <Label>Entity kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ImportKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {IMPORT_KINDS.map((k) => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Upload file (CSV, TSV, JSON, XLSX)</Label>
              <Input type="file" accept=".csv,.tsv,.json,.xls,.xlsx"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)} disabled={parsing} />
            </div>
          </div>
          {parseResult && (
            <div className="text-sm text-muted-foreground">
              Loaded <b>{parseResult.rows.length}</b> rows from <b>{parseResult.source.toUpperCase()}</b>
              {parseResult.sheetName ? ` — sheet: ${parseResult.sheetName}` : ""}.
              {parseResult.warnings.length > 0 && ` ${parseResult.warnings.length} parser warning(s).`}
            </div>
          )}
          {previewCols.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>{previewCols.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      {previewCols.map((c) => <TableCell key={c} className="text-xs max-w-[240px] truncate">{stringify((r as Record<string, unknown>)[c])}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => validateMut.mutate()} disabled={!parseResult || validateMut.isPending} className="gap-2">
              {validateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Validate (dry-run)
            </Button>
            <Button variant="secondary" onClick={() => commitMut.mutate()}
              disabled={!parseResult || !validation || commitMut.isPending} className="gap-2">
              {commitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Commit import
            </Button>
            {validation && (
              <Button variant="outline" onClick={downloadReport} className="gap-2">
                <Download className="h-4 w-4" /> Download validation CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation report */}
      {validation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Validation report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(validation.summary).map(([k, v]) => (
                <span key={k} className={`px-2 py-1 rounded border ${statusColor(k)}`}>{k.replace(/_/g, " ")}: <b>{v}</b></span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-md border max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead><TableHead>Key</TableHead><TableHead>Status</TableHead>
                    <TableHead>Errors</TableHead><TableHead>Warnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validation.outcomes.slice(0, 200).map((o) => (
                    <TableRow key={o.index}>
                      <TableCell className="text-xs">{o.index + 1}</TableCell>
                      <TableCell className="text-xs">{o.key || "—"}</TableCell>
                      <TableCell className="text-xs"><span className={`px-1.5 py-0.5 rounded ${statusColor(o.status)}`}>{o.status.replace(/_/g, " ")}</span></TableCell>
                      <TableCell className="text-xs text-destructive max-w-[280px] truncate" title={o.errors.join(" · ")}>{o.errors.join(" · ")}</TableCell>
                      <TableCell className="text-xs text-amber-600 max-w-[280px] truncate" title={o.warnings.join(" · ")}>{o.warnings.join(" · ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {validation.outcomes.length > 200 && (
                <div className="p-2 text-xs text-muted-foreground text-center">Showing first 200 rows — download CSV for the full report.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commit report */}
      {commitReport && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Import completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Stat label="Inserted" value={commitReport.inserted} />
              <Stat label="Updated" value={commitReport.updated} />
              <Stat label="Attached" value={commitReport.attached} />
              <Stat label="Relationships" value={commitReport.relationships} />
              <Stat label="Downgraded" value={commitReport.downgraded} />
              <Stat label="Skipped" value={commitReport.skipped} />
            </div>
            {commitReport.errors.length > 0 && (
              <details>
                <summary className="cursor-pointer text-destructive">{commitReport.errors.length} error(s)</summary>
                <ul className="mt-2 text-xs space-y-1 max-h-52 overflow-auto">
                  {commitReport.errors.slice(0, 100).map((e, i) => <li key={i}>Row {e.index + 1}: {e.message}</li>)}
                </ul>
              </details>
            )}
            <p className="text-xs text-muted-foreground">
              Every imported entity is instantly searchable inside booking. Promote entities to Tier 1 individually via the Publishing engine after enrichment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function statusColor(s: string): string {
  if (s === "new") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (s === "update") return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300";
  if (s === "duplicate_in_file") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
  if (s === "invalid" || s === "orphan_parent" || s === "orphan_ref") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300";
  return "bg-muted text-muted-foreground border-border";
}

function stringify(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
