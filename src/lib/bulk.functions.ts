/**
 * Bulk import / export for pricing, availability and promotion tables.
 *
 * Admin-only. Every cell is whitelisted and coerced against the registry in
 * `@/lib/bulk-entities` before it reaches the database — unknown columns are
 * dropped rather than causing a failed statement.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBulkEntity, type BulkEntity, type BulkField } from "@/lib/bulk-entities";

// The generated client types infer too deeply for the dynamic table access here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type BulkCell = string | number | boolean | null | string[] | number[];

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as SupabaseLike;
  const { data, error } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

function coerce(field: BulkField, raw: unknown): { value: unknown } | { error: string } {
  if (raw === undefined || raw === null || raw === "") return { value: null };
  const s = typeof raw === "string" ? raw.trim() : raw;
  switch (field.type) {
    case "number": {
      const n = Number(s);
      if (!Number.isFinite(n)) return { error: `${field.name}: not a number ("${String(raw)}")` };
      return { value: n };
    }
    case "boolean": {
      const t = String(s).toLowerCase();
      if (["true", "1", "yes", "y", "active"].includes(t)) return { value: true };
      if (["false", "0", "no", "n", "inactive"].includes(t)) return { value: false };
      return { error: `${field.name}: not a boolean ("${String(raw)}")` };
    }
    case "date": {
      if (!DATE.test(String(s))) return { error: `${field.name}: use YYYY-MM-DD` };
      return { value: String(s) };
    }
    case "time": {
      if (!TIME.test(String(s))) return { error: `${field.name}: use HH:MM` };
      return { value: String(s).length === 5 ? `${String(s)}:00` : String(s) };
    }
    case "timestamp": {
      const d = new Date(String(s));
      if (Number.isNaN(d.getTime())) return { error: `${field.name}: unparseable date/time` };
      return { value: d.toISOString() };
    }
    case "strings":
    case "ints": {
      const parts = Array.isArray(s)
        ? s.map((v) => String(v).trim())
        : String(s).split(/[,|;]/).map((v) => v.trim());
      const clean = parts.filter(Boolean);
      if (field.type === "strings") return { value: clean };
      const nums = clean.map((v) => Number(v));
      if (nums.some((n) => !Number.isInteger(n))) return { error: `${field.name}: whole numbers only` };
      return { value: nums };
    }
    default:
      return { value: String(s) };
  }
}

export type BulkRowReport = {
  index: number;
  status: "new" | "update" | "invalid";
  errors: string[];
  label: string;
};

export type BulkValidation = {
  entity: string;
  total: number;
  counts: { new: number; update: number; invalid: number };
  rows: BulkRowReport[];
  /** Column headers in the file that this dataset does not recognise. */
  unknownColumns: string[];
  /** Cleaned payloads for the rows that passed, in file order. */
  payloads: Record<string, BulkCell>[];
  /** Place IDs the importer looked up from address text on the user's behalf. */
  placesResolved: number;
  /** Address text that Google could not match to a place. */
  placesUnresolved: string[];
  /** True when the file had more addresses to look up than one run allows. */
  placesCapped: boolean;
};

function labelOf(entity: BulkEntity, row: Record<string, BulkCell>): string {
  const key = entity.naturalKey ?? entity.fields[1]?.name ?? "id";
  return String(row[key] ?? row["id"] ?? "(row)");
}

async function buildValidation(
  supabase: SupabaseLike,
  entity: BulkEntity,
  rows: Record<string, unknown>[],
): Promise<BulkValidation> {
  // Existing ids + natural keys, so we can label rows new vs update.
  const select = entity.naturalKey ? `id, ${entity.naturalKey}` : "id";
  const { data: existing, error } = await supabase.from(entity.table).select(select).limit(20000);
  if (error) throw new Error(error.message);
  const ids = new Set<string>((existing ?? []).map((r: Record<string, unknown>) => String(r["id"])));
  const byNatural = new Map<string, string>();
  if (entity.naturalKey) {
    for (const r of existing ?? []) {
      const nk = r[entity.naturalKey];
      if (nk != null) byNatural.set(String(nk).toLowerCase(), String(r["id"]));
    }
  }

  const seen = new Set<string>();
  const reports: BulkRowReport[] = [];
  const payloads: Record<string, BulkCell>[] = [];
  const known = new Set(entity.fields.map((f) => f.name));
  const unknown = new Set<string>();
  for (const raw of rows) {
    for (const key of Object.keys(raw)) if (!known.has(key)) unknown.add(key);
  }


  // Columns the importer can fill itself (Place IDs, vehicle class IDs) must not
  // be reported as missing before those lookups have run.
  const deferred = new Set<string>([
    ...(entity.geo ?? []).map((g) => g.placeId),
    ...(entity.refs ?? []).map((r) => r.idField),
  ]);

  // Pass 1 — whitelist + coerce every cell.
  const staged = rows.map((raw) => {
    const errors: string[] = [];
    const payload: Record<string, BulkCell> = {};
    for (const field of entity.fields) {
      const has = Object.prototype.hasOwnProperty.call(raw, field.name);
      const cell = has ? raw[field.name] : undefined;
      const empty = cell === undefined || cell === null || cell === "";
      if (empty) {
        if (field.required && !deferred.has(field.name)) errors.push(`${field.name} is required`);
        continue;
      }
      const out = coerce(field, cell);
      if ("error" in out) errors.push(out.error);
      else payload[field.name] = out.value as BulkCell;
    }
    return { payload, errors };
  });

  // Pass 2 — fill any missing Place ID from the address text in the file, so a
  // spreadsheet never has to carry Google IDs.
  const geo = await applyGeoResolution(entity, staged);

  // Pass 2b — turn a plain vehicle class name/slug into its uuid.
  await applyRefResolution(supabase, entity, staged);

  // Pass 2c — anything still missing that the file had to supply.
  for (const { payload, errors } of staged) {
    for (const name of deferred) {
      const field = entity.fields.find((f) => f.name === name);
      if (!field?.required) continue;
      const v = payload[name];
      if (v === undefined || v === null || v === "") {
        if (!errors.some((e) => e.startsWith(`${name}:`))) errors.push(`${name} is required`);
      }
    }
    // Helper columns exist for the lookups only — never write them to the table.
    for (const field of entity.fields) if (field.virtual) delete payload[field.name];
  }

  // Pass 3 — decide new vs update and collect the report.
  staged.forEach(({ payload, errors }, index) => {
    let status: BulkRowReport["status"] = "new";
    const id = payload["id"] ? String(payload["id"]) : undefined;
    if (id) {
      if (!ids.has(id)) errors.push(`id ${id} not found in ${entity.table}`);
      else status = "update";
    } else if (entity.naturalKey) {
      const nk = payload[entity.naturalKey];
      if (nk != null) {
        const k = String(nk).toLowerCase();
        if (seen.has(k)) errors.push(`duplicate ${entity.naturalKey} within this file`);
        seen.add(k);
        const match = byNatural.get(k);
        if (match) {
          payload["id"] = match;
          status = "update";
        }
      }
    }

    if (errors.length) status = "invalid";
    else payloads.push(payload);
    reports.push({ index: index + 2, status, errors, label: labelOf(entity, payload) });
  });

  return {
    entity: entity.key,
    total: rows.length,
    counts: {
      new: reports.filter((r) => r.status === "new").length,
      update: reports.filter((r) => r.status === "update").length,
      invalid: reports.filter((r) => r.status === "invalid").length,
    },
    rows: reports,
    unknownColumns: [...unknown].sort(),
    payloads,
    placesResolved: geo.resolved,
    placesUnresolved: geo.unresolved,
    placesCapped: geo.capped,
  };
}

/**
 * Fills uuid columns (e.g. `vehicle_class_id`) from a plain name or slug typed
 * in the spreadsheet, so an import never needs database IDs.
 */
async function applyRefResolution(
  supabase: SupabaseLike,
  entity: BulkEntity,
  staged: Array<{ payload: Record<string, BulkCell>; errors: string[] }>,
): Promise<void> {
  if (!entity.refs?.length) return;
  for (const spec of entity.refs) {
    const needed = staged.some(({ payload }) => {
      const current = payload[spec.idField];
      const hasId = typeof current === "string" && current.trim().length > 0;
      return !hasId && spec.textFields.some((f) => typeof payload[f] === "string" && String(payload[f]).trim());
    });
    if (!needed) continue;

    const { data, error } = await supabase
      .from(spec.table)
      .select(["id", ...spec.matchColumns].join(", "))
      .limit(5000);
    if (error) throw new Error(error.message);
    const byText = new Map<string, string>();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      for (const col of spec.matchColumns) {
        const v = row[col];
        if (v != null) byText.set(String(v).trim().toLowerCase(), String(row["id"]));
      }
    }

    for (const { payload, errors } of staged) {
      const current = payload[spec.idField];
      if (typeof current === "string" && current.trim().length > 0) continue;
      const text = spec.textFields
        .map((f) => payload[f])
        .find((v) => typeof v === "string" && String(v).trim().length > 0);
      if (typeof text !== "string") continue;
      const match = byText.get(text.trim().toLowerCase());
      if (match) payload[spec.idField] = match;
      else errors.push(`${spec.idField}: no ${spec.label} called “${text.trim()}”`);
    }
  }
}

/**
 * Looks up a Google Place ID for every row whose Place ID column is blank but
 * that carries address text, and writes the id, label and coordinates back into
 * the payload. Rows keep any Place ID they already supplied.
 */
async function applyGeoResolution(
  entity: BulkEntity,
  staged: Array<{ payload: Record<string, BulkCell>; errors: string[] }>,
): Promise<{ resolved: number; unresolved: string[]; capped: boolean }> {
  if (!entity.geo?.length) return { resolved: 0, unresolved: [], capped: false };

  const searchTextFor = (payload: Record<string, BulkCell>, spec: NonNullable<BulkEntity["geo"]>[number]) => {
    const base = spec.text.map((f) => payload[f]).find((v) => typeof v === "string" && v.trim().length > 1);
    if (typeof base !== "string") return null;
    const extra = (spec.context ?? [])
      .filter((f) => !spec.text.includes(f))
      .map((f) => payload[f])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    const parts = [base.trim(), ...extra.map((v) => v.trim())].filter(
      (v, i, arr) => arr.findIndex((o) => o.toLowerCase() === v.toLowerCase()) === i,
    );
    return [...parts, "United Kingdom"].join(", ");
  };

  // Coordinates supplied in the sheet make the lookup exact; a row with only
  // coordinates is resolved by reverse geocoding.
  const num = (v: BulkCell) => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const requestFor = (payload: Record<string, BulkCell>, spec: NonNullable<BulkEntity["geo"]>[number]) => {
    const text = searchTextFor(payload, spec);
    const lat = spec.lat ? num(payload[spec.lat]) : null;
    const lng = spec.lng ? num(payload[spec.lng]) : null;
    if (!text && (lat == null || lng == null)) return null;
    return { text: text ?? "", lat, lng };
  };

  const wanted: Array<{ text: string; lat: number | null; lng: number | null }> = [];
  for (const { payload } of staged) {
    for (const spec of entity.geo) {
      const current = payload[spec.placeId];
      if (typeof current === "string" && current.trim().length > 0) continue;
      const req = requestFor(payload, spec);
      if (req) wanted.push(req);
    }
  }
  if (wanted.length === 0) return { resolved: 0, unresolved: [], capped: false };

  const { resolvePlaceTexts, placeRequestKey } = await import("@/lib/place-resolve.server");
  const { map, capped } = await resolvePlaceTexts(wanted);

  let resolved = 0;
  const unresolved = new Set<string>();
  for (const { payload, errors } of staged) {
    for (const spec of entity.geo) {
      const current = payload[spec.placeId];
      if (typeof current === "string" && current.trim().length > 0) continue;
      const req = requestFor(payload, spec);
      if (!req) continue;
      const text = req.text || `${req.lat},${req.lng}`;
      const hit = map.get(placeRequestKey(req));
      if (!hit) {
        unresolved.add(text);
        const field = entity.fields.find((f) => f.name === spec.placeId);
        if (field?.required) errors.push(`${spec.placeId}: could not find “${text}” on Google Maps`);
        continue;
      }
      payload[spec.placeId] = hit.placeId;
      resolved += 1;
      if (spec.label && !payload[spec.label]) payload[spec.label] = hit.label;
      if (spec.lat && payload[spec.lat] == null && hit.lat != null) payload[spec.lat] = hit.lat;
      if (spec.lng && payload[spec.lng] == null && hit.lng != null) payload[spec.lng] = hit.lng;
    }
  }

  return { resolved, unresolved: [...unresolved].slice(0, 25), capped };
}

const rowsInput = z.object({
  entity: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())).max(20000),
});

export const exportBulkEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ entity: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }): Promise<{ entity: string; rows: Record<string, BulkCell>[] }> => {
    await assertAdmin(context);
    const entity = getBulkEntity(data.entity);
    if (!entity) throw new Error("Unknown entity");
    const supabase = context.supabase as SupabaseLike;
    const real = entity.fields.filter((f) => !f.virtual);
    const cols = real.map((f) => f.name).join(", ");
    const { data: rows, error } = await supabase
      .from(entity.table)
      .select(cols)
      .order(entity.orderBy, { ascending: false })
      .limit(20000);
    if (error) throw new Error(error.message);
    // Flatten arrays to comma lists so the CSV round-trips through the importer.
    const flat = (rows ?? []).map((r: Record<string, unknown>) => {
      const out: Record<string, BulkCell> = {};
      for (const f of real) {
        const v = r[f.name];
        out[f.name] = Array.isArray(v) ? v.join(",") : ((v ?? "") as BulkCell);
      }
      return out;
    });
    return { entity: entity.key, rows: flat };
  });

export const validateBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => rowsInput.parse(i))
  .handler(async ({ data, context }): Promise<BulkValidation> => {
    await assertAdmin(context);
    const entity = getBulkEntity(data.entity);
    if (!entity) throw new Error("Unknown entity");
    return buildValidation(context.supabase as SupabaseLike, entity, data.rows);
  });

export const commitBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => rowsInput.extend({ skipInvalid: z.boolean().default(true) }).parse(i))
  .handler(async ({ data, context }): Promise<{ ok: true; written: number; skipped: number; failures: string[] }> => {
    await assertAdmin(context);
    const entity = getBulkEntity(data.entity);
    if (!entity) throw new Error("Unknown entity");
    const supabase = context.supabase as SupabaseLike;
    const report = await buildValidation(supabase, entity, data.rows);
    if (report.counts.invalid > 0 && !data.skipInvalid) {
      throw new Error(`${report.counts.invalid} invalid row(s) — fix them or enable "skip invalid rows".`);
    }

    const failures: string[] = [];
    let written = 0;
    const CHUNK = 200;

    // A batched write requires every object in the batch to carry the same keys
    // (the data API rejects mixed shapes outright), and blank cells legitimately
    // differ from row to row. Group rows by their exact column signature first,
    // so every batch is uniform. Rows that resolved to an existing row keep
    // their id and update; the rest insert.
    const groups = new Map<string, Record<string, BulkCell>[]>();
    for (const row of report.payloads) {
      const key = Object.keys(row).sort().join("|");
      const bucket = groups.get(key);
      if (bucket) bucket.push(row);
      else groups.set(key, [row]);
    }

    for (const bucket of groups.values()) {
      for (let i = 0; i < bucket.length; i += CHUNK) {
        const chunk = bucket.slice(i, i + CHUNK);
        const hasId = chunk[0] && chunk[0]["id"] != null;
        const write = hasId
          ? supabase.from(entity.table).upsert(chunk, { onConflict: "id" })
          : supabase.from(entity.table).insert(chunk);
        const { error } = await write;
        if (error) {
          // Retry row-by-row so one bad row doesn't discard the whole chunk.
          for (const row of chunk) {
            const { error: rowError } = row["id"] != null
              ? await supabase.from(entity.table).upsert(row, { onConflict: "id" })
              : await supabase.from(entity.table).insert(row);
            if (rowError) failures.push(`${labelOf(entity, row)}: ${rowError.message}`);
            else written += 1;
          }
        } else {
          written += chunk.length;
        }
      }
    }

    return { ok: true, written, skipped: report.counts.invalid, failures: failures.slice(0, 50) };
  });
