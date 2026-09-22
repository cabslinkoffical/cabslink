/**
 * Reusable bulk tools for any admin section.
 *
 * `<BulkTools entity="seo_locations" />` renders a single button that opens
 * template download, CSV/XLSX export and validated import for that dataset.
 * `<BulkActionBar>` renders the selection toolbar (activate / publish / delete)
 * for rows ticked in a list.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Download, FileDown, Layers, Loader2, Play, Trash2, UploadCloud, X,
} from "lucide-react";
import { parseImportFile, reportToCsv, type ParseResult } from "@/lib/seo/import-parser";
import { getBulkEntity, templateHeaders } from "@/lib/bulk-entities";
import {
  exportBulkEntity, validateBulkImport, commitBulkImport, type BulkValidation,
} from "@/lib/bulk.functions";
import { bulkSetFlag, bulkDeleteRows } from "@/lib/bulk-actions.functions";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkTools({
  entity: entityKey,
  onChanged,
  label = "Bulk import / export",
}: {
  entity: string;
  onChanged?: () => void | Promise<unknown>;
  label?: string;
}) {
  const entity = getBulkEntity(entityKey);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [validation, setValidation] = useState<BulkValidation | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [parsing, setParsing] = useState(false);

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
    onSuccess: async (r) => {
      toast.success(`Saved ${r.written} row(s)${r.skipped ? `, skipped ${r.skipped}` : ""}`);
      if (r.failures.length) toast.error(`${r.failures.length} row(s) rejected — see the report below`);
      await onChanged?.();
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Import failed"),
  });

  if (!entity) return null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setValidation(null);
    try {
      const result = await parseImportFile(file);
      setParsed(result);
      if (!result.rows.length) {
        toast.error("That file has no data rows.");
        return;
      }
      // Check the file straight away so the report is on screen before importing.
      const v = await validateBulkImport({ data: { entity: entityKey, rows: result.rows } });
      setValidation(v);
      if (v.counts.invalid > 0) toast.warning(`${v.counts.invalid} of ${v.total} row(s) need attention`);
      else toast.success(`${v.total} row(s) ready to import`);
    } catch (e) {
      toast.error((e as Error).message ?? "Could not read file");
      setParsed(null);
    } finally {
      setParsing(false);
    }
  }

  const importable = validation
    ? (skipInvalid ? validation.total - validation.counts.invalid : validation.total) > 0 &&
      (skipInvalid || validation.counts.invalid === 0)
    : false;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setParsed(null); setValidation(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Layers className="mr-2 size-4" />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entity.label} — bulk import &amp; export</DialogTitle>
          <DialogDescription>
            CSV, TSV, JSON or XLSX. Rows with an id{entity.naturalKey ? ` or a matching ${entity.naturalKey}` : ""} are updated; everything else is created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => download(
              new Blob([`${templateHeaders(entity).join(",")}\n`], { type: "text/csv;charset=utf-8" }),
              `${entityKey}-template.csv`,
            )}>
              <FileDown className="mr-2 size-4" /> Blank template
            </Button>
            <Button variant="outline" size="sm" disabled={exportMut.isPending} onClick={() => exportMut.mutate()}>
              {exportMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Export current data
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Columns: {entity.fields.map((f) => f.name + (f.required ? "*" : "")).join(", ")}
          </p>

          {entity.refs?.length ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">No IDs needed</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {entity.refs.map((r) => (
                  <li key={r.idField}>
                    Type the {r.label} name (or its web address name) in{" "}
                    <span className="font-medium">{r.textFields[0]}</span> and leave{" "}
                    <span className="font-medium">{r.idField}</span> blank — we match it for you.
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {entity.geo?.length ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Locations are matched on Google Maps for you</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {entity.geo.map((g) => (
                  <li key={g.placeId}>
                    Type the place in <span className="font-medium">{g.text.join(" or ")}</span> and leave{" "}
                    <span className="font-medium">{[g.placeId, g.lat, g.lng].filter(Boolean).join(", ")}</span> blank — we fill them in.
                    {g.lat && g.lng ? ` If you already know the coordinates, put them in ${g.lat}/${g.lng} for an exact match (they work on their own too).` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={`bulk-file-${entityKey}`}>Upload file</Label>
            <Input id={`bulk-file-${entityKey}`} type="file" accept=".csv,.tsv,.json,.xls,.xlsx"
              onChange={(e) => onFile(e.target.files?.[0])} />
          </div>

          {parsing && <p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline size-4 animate-spin" /> Reading and checking file…</p>}
          {parsed && (
            <p className="text-sm text-muted-foreground">
              {parsed.rows.length} row(s) parsed from {parsed.source.toUpperCase()}
              {parsed.sheetName ? ` · sheet "${parsed.sheetName}"` : ""}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" disabled={!parsed || validateMut.isPending} onClick={() => validateMut.mutate()}>
              {validateMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
              Re-check file
            </Button>
            <div className="flex items-center gap-2">
              <Switch id={`skip-${entityKey}`} checked={skipInvalid} onCheckedChange={setSkipInvalid} />
              <Label htmlFor={`skip-${entityKey}`} className="text-sm font-normal">Skip invalid rows</Label>
            </div>
            <Button size="sm" variant="secondary" disabled={!importable || commitMut.isPending} onClick={() => commitMut.mutate()}>
              {commitMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UploadCloud className="mr-2 size-4" />}
              Import
            </Button>
            {validation && !importable && (
              <span className="text-xs text-muted-foreground">
                Fix the issues below, or switch on “Skip invalid rows”.
              </span>
            )}
          </div>

          {validation && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-success">New {validation.counts.new}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Update {validation.counts.update}</span>
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">Invalid {validation.counts.invalid}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Total {validation.total}</span>
              </div>
              {validation.unknownColumns.length > 0 && (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  These columns were ignored because this dataset has no matching field:{" "}
                  <span className="font-medium">{validation.unknownColumns.join(", ")}</span>
                </p>
              )}
              {validation.placesResolved > 0 && (
                <p className="rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {validation.placesResolved} address{validation.placesResolved === 1 ? "" : "es"} matched on Google Maps
                  </span>{" "}
                  — the map IDs and coordinates are filled in for you, so you never need to type them.
                </p>
              )}
              {validation.placesUnresolved.length > 0 && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-muted-foreground">
                  Google could not find these addresses — make them more specific and re-upload:{" "}
                  <span className="font-medium">{validation.placesUnresolved.join(" · ")}</span>
                </p>
              )}
              {validation.placesCapped && (
                <p className="text-xs text-muted-foreground">
                  This file has a lot of new addresses — only the first 300 were looked up in this run. Import, then re-upload the rest.
                </p>
              )}
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/70 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Line</th>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.rows.slice(0, 300).map((r) => (
                      <tr key={r.index} className="border-t border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">{r.index}</td>
                        <td className="px-3 py-1.5">{r.label}</td>
                        <td className="px-3 py-1.5">{r.status}</td>
                        <td className="px-3 py-1.5 text-xs text-destructive">{r.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validation.rows.length > 300 && (
                <p className="text-xs text-muted-foreground">Showing the first 300 of {validation.rows.length} rows.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BulkActionBar({
  entity: entityKey,
  ids,
  onClear,
  onChanged,
}: {
  entity: string;
  ids: string[];
  onClear: () => void;
  onChanged?: () => void | Promise<unknown>;
}) {
  const entity = getBulkEntity(entityKey);
  const [busy, setBusy] = useState(false);
  if (!entity || ids.length === 0) return null;

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      onClear();
      await onChanged?.();
    } catch (e) {
      toast.error((e as Error).message ?? "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card flex flex-wrap items-center gap-2 border-primary/30 bg-primary/[0.04] px-3 py-2">
      <span className="text-sm font-medium">{ids.length} selected</span>
      <span className="mx-1 h-4 w-px bg-border" />
      {entity.flags?.map((f) => (
        <span key={f.name} className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={busy}
            onClick={() => run(() => bulkSetFlag({ data: { entity: entityKey, ids, field: f.name, value: true } }), `${f.label} on for ${ids.length} row(s)`)}>
            {f.label} on
          </Button>
          <Button variant="outline" size="sm" disabled={busy}
            onClick={() => run(() => bulkSetFlag({ data: { entity: entityKey, ids, field: f.name, value: false } }), `${f.label} off for ${ids.length} row(s)`)}>
            {f.label} off
          </Button>
        </span>
      ))}
      {entity.deletable && (
        <Button variant="ghost" size="sm" className="text-destructive" disabled={busy}
          onClick={() => {
            if (!confirm(`Delete ${ids.length} row(s)? This cannot be undone.`)) return;
            void run(() => bulkDeleteRows({ data: { entity: entityKey, ids } }), `Deleted ${ids.length} row(s)`);
          }}>
          <Trash2 className="mr-2 size-4" /> Delete
        </Button>
      )}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear} disabled={busy}>
        <X className="mr-1 size-4" /> Clear
      </Button>
      {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
