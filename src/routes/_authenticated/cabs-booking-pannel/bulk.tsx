import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UploadCloud, Download, Play, CheckCircle2, AlertTriangle, Loader2, FileDown } from "lucide-react";
import { parseImportFile, reportToCsv, type ParseResult } from "@/lib/seo/import-parser";
import { BULK_ENTITIES, getBulkEntity, templateHeaders } from "@/lib/bulk-entities";
import {
  exportBulkEntity, validateBulkImport, commitBulkImport,
  type BulkValidation,
} from "@/lib/bulk.functions";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Import & Export — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: bulk import and export of pricing and availability rules." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BulkPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
});

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BulkPage() {
  const [entityKey, setEntityKey] = useState<string>(BULK_ENTITIES[0]!.key);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [validation, setValidation] = useState<BulkValidation | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [parsing, setParsing] = useState(false);
  const entity = getBulkEntity(entityKey)!;

  const exportMut = useMutation({
    mutationFn: async () => {
      const res = await exportBulkEntity({ data: { entity: entityKey } });
      if (!res.rows.length) throw new Error("Nothing to export — this table is empty.");
      const blob = await reportToCsv(res.rows as Array<Record<string, unknown>>);
      download(blob, `${entityKey}-${new Date().toISOString().slice(0, 10)}.csv`);
      return res.rows.length;
    },
    onSuccess: (n) => toast.success(`Exported ${n} row(s)`),
    onError: (e: unknown) => toast.error((e as Error).message ?? "Export failed"),
  });

  const validateMut = useMutation({
    mutationFn: async () => {
      if (!parsed?.rows.length) throw new Error("Upload a file first.");
      return validateBulkImport({ data: { entity: entityKey, rows: parsed.rows } });
    },
    onSuccess: (v) => { setValidation(v); toast.success(`Validated ${v.total} row(s)`); },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Validation failed"),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      if (!parsed?.rows.length) throw new Error("Upload a file first.");
      return commitBulkImport({ data: { entity: entityKey, rows: parsed.rows, skipInvalid } });
    },
    onSuccess: (r) => {
      toast.success(`Saved ${r.written} row(s)${r.skipped ? `, skipped ${r.skipped}` : ""}`);
      if (r.failures.length) toast.error(`${r.failures.length} row(s) rejected — see report`);
      setValidation((v) => v);
      if (r.failures.length) console.warn("Bulk import failures", r.failures);
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Import failed"),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setValidation(null);
    try {
      setParsed(await parseImportFile(file));
    } catch (e) {
      toast.error((e as Error).message ?? "Could not read file");
      setParsed(null);
    } finally {
      setParsing(false);
    }
  }

  function downloadTemplate() {
    const headers = templateHeaders(entity);
    download(new Blob([`${headers.join(",")}\n`], { type: "text/csv;charset=utf-8" }), `${entityKey}-template.csv`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Import & Export"
        description="Move pricing, availability and promotion rules in and out as CSV, TSV, JSON or XLSX. Rows with an id (or a matching name/code) are updated; everything else is created."
      />

      <Card>
        <CardHeader><CardTitle className="text-base">1. Choose a dataset</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-entity">Dataset</Label>
              <Select value={entityKey} onValueChange={(v) => { setEntityKey(v); setParsed(null); setValidation(null); }}>
                <SelectTrigger id="bulk-entity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BULK_ENTITIES.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <FileDown className="mr-2 size-4" /> Template
            </Button>
            <Button variant="outline" disabled={exportMut.isPending} onClick={() => exportMut.mutate()}>
              {exportMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Export current data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Columns: {entity.fields.map((f) => f.name + (f.required ? "*" : "")).join(", ")}
            {entity.naturalKey ? ` — rows are matched on ${entity.naturalKey} when no id is supplied.` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Upload &amp; validate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-file">File (.csv, .tsv, .json, .xlsx)</Label>
            <Input id="bulk-file" type="file" accept=".csv,.tsv,.json,.xls,.xlsx"
              onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {parsing && <p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline size-4 animate-spin" /> Reading file…</p>}
          {parsed && (
            <p className="text-sm text-muted-foreground">
              {parsed.rows.length} row(s) parsed from {parsed.source.toUpperCase()}
              {parsed.sheetName ? ` · sheet "${parsed.sheetName}"` : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!parsed || validateMut.isPending} onClick={() => validateMut.mutate()}>
              {validateMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
              Validate
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="skip-invalid" checked={skipInvalid} onCheckedChange={setSkipInvalid} />
              <Label htmlFor="skip-invalid" className="text-sm font-normal">Skip invalid rows on import</Label>
            </div>
            <Button variant="secondary" disabled={!parsed || commitMut.isPending} onClick={() => commitMut.mutate()}>
              {commitMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UploadCloud className="mr-2 size-4" />}
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {validation && (
        <Card>
          <CardHeader><CardTitle className="text-base">3. Validation report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700">New {validation.counts.new}</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Update {validation.counts.update}</span>
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">Invalid {validation.counts.invalid}</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Total {validation.total}</span>
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/70">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Line</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.rows.map((r) => (
                    <tr key={r.index} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">{r.index}</td>
                      <td className="px-3 py-1.5">{r.label}</td>
                      <td className="px-3 py-1.5">
                        {r.status === "invalid" ? (
                          <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" /> invalid</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-3.5" /> {r.status}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.errors.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" onClick={async () => {
              const blob = await reportToCsv(validation.rows.map((r) => ({ ...r, errors: r.errors.join("; ") })));
              download(blob, `${entityKey}-validation.csv`);
            }}>
              <Download className="mr-2 size-4" /> Download report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
