/**
 * Universal import parser — CSV, JSON, XLSX → ParsedRow[].
 * Client-safe. Heavy parsers (`xlsx`, `papaparse`) are dynamically imported
 * so the main bundle stays small.
 */
export type ParsedRow = Record<string, unknown>;
export type ParseResult = {
  rows: ParsedRow[];
  source: "csv" | "json" | "xlsx";
  sheetName?: string;
  warnings: string[];
};

const LIST_KEYS = new Set([
  "keywords", "synonyms", "tags", "intents", "search_intents",
  "nearby", "popular_routes", "related_services", "internal_links",
]);

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Trim strings, split comma-separated list columns, drop empty cells. */
export function normalizeRow(row: ParsedRow): ParsedRow {
  const out: ParsedRow = {};
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = normalizeKey(rawKey);
    if (rawVal == null || rawVal === "") continue;
    if (typeof rawVal === "string") {
      const t = rawVal.trim();
      if (!t) continue;
      if (LIST_KEYS.has(key)) {
        out[key] = t.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      } else if (t.startsWith("[") || t.startsWith("{")) {
        try { out[key] = JSON.parse(t); } catch { out[key] = t; }
      } else {
        out[key] = t;
      }
    } else if (Array.isArray(rawVal)) {
      out[key] = rawVal.map((v) => (typeof v === "string" ? v.trim() : v)).filter((v) => v !== "" && v != null);
    } else {
      out[key] = rawVal;
    }
  }
  return out;
}

/** Parse a File object based on its extension. */
export async function parseImportFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  const warnings: string[] = [];

  if (name.endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    const rows: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { rows?: unknown[] }).rows)
        ? (data as { rows: unknown[] }).rows
        : [data];
    return { rows: rows.map((r) => normalizeRow((r ?? {}) as ParsedRow)), source: "json", warnings };
  }

  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const parsed = Papa.parse<ParsedRow>(text, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      delimiter: name.endsWith(".tsv") ? "\t" : undefined,
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors?.length) warnings.push(...parsed.errors.slice(0, 10).map((e) => `Row ${e.row}: ${e.message}`));
    return {
      rows: (parsed.data ?? []).filter((r): r is ParsedRow => r && typeof r === "object").map(normalizeRow),
      source: "csv",
      warnings,
    };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("Workbook contains no sheets.");
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null, raw: true });
    return { rows: raw.map(normalizeRow), source: "xlsx", sheetName, warnings };
  }

  throw new Error(`Unsupported file type: ${file.name}. Use .csv, .tsv, .json, .xls, or .xlsx.`);
}

/** Export a report as a downloadable CSV blob. */
export async function reportToCsv(rows: Array<Record<string, unknown>>): Promise<Blob> {
  const Papa = (await import("papaparse")).default;
  const csv = Papa.unparse(rows);
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
