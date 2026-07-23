/**
 * Universal SEO import engine — validation + classification + commit.
 *
 * All mutating calls require an authenticated admin (verified via has_role RPC).
 * Nothing here generates URLs, publishes pages, or writes SEO content — it only
 * imports structured data, wires up relationships, and stores unpublished drafts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IMPORT_KINDS,
  DESTINATION_KINDS,
  destinationRowSchema,
  keywordRowSchema,
  tagRowSchema,
  searchIntentRowSchema,
  relationshipRowSchema,
  importRulesetSchema,
  DEFAULT_RULESET,
  type ImportKind,
  type ImportRuleset,
} from "@/lib/seo/import-schema";

const RULES_KEY = "seo_import_rules";

/* ------------------------------------------------------------------ */
/* Admin gate                                                          */
/* ------------------------------------------------------------------ */
async function assertAdmin(context: { supabase: unknown; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = context.supabase as any;
  const { data, error } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

/* ------------------------------------------------------------------ */
/* Ruleset (stored in private_settings.value as JSON)                  */
/* ------------------------------------------------------------------ */
// The generated Supabase client type infers too deeply for the many builder
// chains this file constructs, so we intentionally erase types inside the
// engine and rely on runtime shape checks + tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

async function loadRuleset(supabase: SupabaseLike): Promise<ImportRuleset> {
  const { data } = await supabase.from("private_settings").select("value").eq("key", RULES_KEY).maybeSingle();
  const raw = (data as { value?: string } | null)?.value;
  if (!raw) return DEFAULT_RULESET;
  try { return importRulesetSchema.parse(JSON.parse(raw)); } catch { return DEFAULT_RULESET; }
}

export const getImportRuleset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImportRuleset> => {
    await assertAdmin(context);
    return loadRuleset(context.supabase as SupabaseLike);
  });

export const updateImportRuleset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => importRulesetSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; ruleset: ImportRuleset }> => {
    await assertAdmin(context);
    const supabase = context.supabase as SupabaseLike;
    const { error } = await supabase.from("private_settings").upsert(
      { key: RULES_KEY, value: JSON.stringify(data) },
      { onConflict: "key" },
    );
    if (error) throw new Error(String((error as { message?: string }).message ?? "Failed to save ruleset"));
    return { ok: true, ruleset: data };
  });

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */
export type ValidationOutcome = {
  index: number;
  kind: ImportKind;
  key: string;                        // e.g. "town:st-andrews" or the keyword text
  status: "new" | "update" | "duplicate_in_file" | "invalid" | "orphan_parent" | "orphan_ref";
  errors: string[];
  warnings: string[];
};

type ValidateInput = { kind: ImportKind; rows: unknown[] };

const validateInputSchema = z.object({
  kind: z.enum(IMPORT_KINDS as unknown as [ImportKind, ...ImportKind[]]),
  rows: z.array(z.unknown()).max(5000),
});

/** Validate + classify a batch without writing. Detects duplicates, broken refs,
 *  circular parents, missing required fields, and reports a per-row status. */
export const validateImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ValidateInput) => validateInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ outcomes: ValidationOutcome[]; summary: Record<string, number> }> => {
    await assertAdmin(context);
    const supabase = context.supabase as SupabaseLike;
    return runValidation(supabase, data.kind, data.rows);
  });

async function runValidation(
  supabase: SupabaseLike,
  kind: ImportKind,
  rows: unknown[],
): Promise<{ outcomes: ValidationOutcome[]; summary: Record<string, number> }> {
  const outcomes: ValidationOutcome[] = [];
  const seenInFile = new Set<string>();

  // Parse each row against its schema, gather keys to look up in DB.
  type Parsed = { index: number; ok: boolean; row?: unknown; errors: string[]; key: string };
  const parsed: Parsed[] = rows.map((raw, index): Parsed => {
    const schema =
      DESTINATION_KINDS.has(kind) ? destinationRowSchema :
      kind === "keyword" ? keywordRowSchema :
      kind === "tag" ? tagRowSchema :
      kind === "search_intent" ? searchIntentRowSchema :
      kind === "relationship" ? relationshipRowSchema :
      null;
    if (!schema) return { index, ok: false, errors: [`Unsupported kind: ${kind}`], key: "" };
    const res = schema.safeParse(raw);
    if (!res.success) {
      return {
        index, ok: false,
        errors: res.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`),
        key: "",
      };
    }
    const row = res.data as Record<string, unknown>;
    const key =
      DESTINATION_KINDS.has(kind) ? `${kind}:${row.slug as string}` :
      kind === "keyword" ? `kw:${String(row.keyword).toLowerCase()}` :
      kind === "tag" ? `tag:${String(row.tag).toLowerCase()}` :
      kind === "search_intent" ? `si:${String(row.intent).toLowerCase()}` :
      /* relationship */ `rel:${row.from_type}:${row.from_slug}->${row.to_type}:${row.to_slug}:${row.rel_type}`;
    return { index, ok: true, row, errors: [], key };
  });

  // Batch existence checks
  const destKeys = new Set<string>();
  if (DESTINATION_KINDS.has(kind)) {
    for (const p of parsed) if (p.ok) destKeys.add(p.key);
  }
  // For destinations: also need parent + reference (nearby/related/popular_routes) lookups
  const refKeys = new Set<string>();
  const parentKeys = new Set<string>();
  for (const p of parsed) {
    if (!p.ok) continue;
    const r = p.row as Record<string, unknown>;
    if (DESTINATION_KINDS.has(kind)) {
      if (r.parent_slug && r.parent_type) parentKeys.add(`${r.parent_type as string}:${r.parent_slug as string}`);
      for (const list of ["nearby", "popular_routes", "related_services"] as const) {
        for (const ref of (r[list] as string[] | undefined) ?? []) {
          // Expect "type:slug" format
          if (ref.includes(":")) refKeys.add(ref);
        }
      }
      if (kind === "route") {
        if (r.from_type && r.from_slug) refKeys.add(`${r.from_type}:${r.from_slug}`);
        if (r.to_type && r.to_slug) refKeys.add(`${r.to_type}:${r.to_slug}`);
      }
    } else if (kind === "keyword" || kind === "tag" || kind === "search_intent") {
      if (r.attach_to_slug && r.attach_to_type) refKeys.add(`${r.attach_to_type}:${r.attach_to_slug}`);
    } else if (kind === "relationship") {
      refKeys.add(`${r.from_type}:${r.from_slug}`);
      refKeys.add(`${r.to_type}:${r.to_slug}`);
    }
  }

  const existingDest = await fetchDestinationKeySet(supabase, [...destKeys, ...refKeys, ...parentKeys]);

  // Fill outcomes
  for (const p of parsed) {
    if (!p.ok) {
      outcomes.push({ index: p.index, kind, key: "", status: "invalid", errors: p.errors, warnings: [] });
      continue;
    }
    const r = p.row as Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];
    let status: ValidationOutcome["status"] = "new";

    if (seenInFile.has(p.key)) status = "duplicate_in_file";
    seenInFile.add(p.key);

    if (DESTINATION_KINDS.has(kind)) {
      if (existingDest.has(p.key) && status !== "duplicate_in_file") status = "update";

      // Parent must exist (or be in same file)
      if (r.parent_slug && r.parent_type) {
        const pk = `${r.parent_type}:${r.parent_slug}`;
        if (!existingDest.has(pk) && !seenInFile.has(pk)) {
          status = "orphan_parent";
          errors.push(`Parent not found: ${pk}`);
        }
        if (pk === p.key) errors.push("Circular parent reference (row references itself).");
      }

      // Coordinate warnings
      if (r.lat == null || r.lng == null) warnings.push("Missing coordinates (lat/lng); nearby matching will be limited.");
      // Type-specific required-field checks
      if (kind === "airport" && !(r.meta as Record<string, unknown> | undefined)?.iata) warnings.push("Airport missing meta.iata code.");
      if (kind === "route") {
        if (!r.from_slug || !r.to_slug) errors.push("Route requires from_slug and to_slug.");
        for (const ref of [`${r.from_type}:${r.from_slug}`, `${r.to_type}:${r.to_slug}`]) {
          if (r.from_slug && r.to_slug && !existingDest.has(ref) && !seenInFile.has(ref)) {
            errors.push(`Route endpoint not found: ${ref}`);
            status = "orphan_ref";
          }
        }
      }
      // Reference lists
      for (const list of ["nearby", "popular_routes", "related_services"] as const) {
        for (const ref of (r[list] as string[] | undefined) ?? []) {
          if (ref.includes(":") && !existingDest.has(ref) && !seenInFile.has(ref)) {
            warnings.push(`Referenced ${list.replace(/_/g, " ")} not found (will skip): ${ref}`);
          }
        }
      }
    } else if (kind === "relationship") {
      const fromK = `${r.from_type}:${r.from_slug}`;
      const toK = `${r.to_type}:${r.to_slug}`;
      if (!existingDest.has(fromK)) { errors.push(`from not found: ${fromK}`); status = "orphan_ref"; }
      if (!existingDest.has(toK)) { errors.push(`to not found: ${toK}`); status = "orphan_ref"; }
      if (fromK === toK) errors.push("Self-relationship is not allowed.");
    } else if (r.attach_to_slug && r.attach_to_type) {
      const k = `${r.attach_to_type}:${r.attach_to_slug}`;
      if (!existingDest.has(k)) warnings.push(`Attach target not found (will import taxonomy only): ${k}`);
    }

    if (errors.length) status = status === "duplicate_in_file" ? status : "invalid";
    outcomes.push({ index: p.index, kind, key: p.key, status, errors, warnings });
  }

  // Summary
  const summary: Record<string, number> = {};
  for (const o of outcomes) summary[o.status] = (summary[o.status] ?? 0) + 1;
  return { outcomes, summary };
}

async function fetchDestinationKeySet(supabase: SupabaseLike, keys: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  if (!keys.length) return set;
  // Chunk to keep IN() lists reasonable.
  const chunkSize = 400;
  const pairs = keys.map((k) => k.split(":") as [string, string]).filter((p) => p.length === 2 && p[1]);
  const byType = new Map<string, string[]>();
  for (const [t, s] of pairs) {
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(s);
  }
  for (const [t, slugs] of byType) {
    for (let i = 0; i < slugs.length; i += chunkSize) {
      const slice = slugs.slice(i, i + chunkSize);
      const { data } = await supabase.from("destinations").select("type,slug").eq("type", t).in("slug", slice);
      for (const r of ((data as Array<{ type: string; slug: string }>) ?? [])) {
        set.add(`${r.type}:${r.slug}`);
      }
    }
  }
  return set;
}

/* ------------------------------------------------------------------ */
/* Commit                                                              */
/* ------------------------------------------------------------------ */
export type CommitReport = {
  kind: ImportKind;
  inserted: number;
  updated: number;
  attached: number;             // taxonomy attachments made
  relationships: number;        // relationships written
  downgraded: number;           // tier downgraded by ruleset
  skipped: number;
  errors: Array<{ index: number; message: string }>;
};

const commitInputSchema = z.object({
  kind: z.enum(IMPORT_KINDS as unknown as [ImportKind, ...ImportKind[]]),
  rows: z.array(z.unknown()).max(5000),
});

export const commitImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: ImportKind; rows: unknown[] }) => commitInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<CommitReport> => {
    await assertAdmin(context);
    const supabase = context.supabase as SupabaseLike;
    const rules = await loadRuleset(supabase);
    if (DESTINATION_KINDS.has(data.kind)) return commitDestinations(supabase, data.kind, data.rows, rules);
    if (data.kind === "keyword") return commitKeywords(supabase, data.rows);
    if (data.kind === "tag") return commitTags(supabase, data.rows);
    if (data.kind === "search_intent") return commitSearchIntents(supabase, data.rows);
    if (data.kind === "relationship") return commitRelationships(supabase, data.rows);
    throw new Error(`Unsupported kind: ${data.kind}`);
  });

async function commitDestinations(
  supabase: SupabaseLike,
  kind: ImportKind,
  rows: unknown[],
  rules: ImportRuleset,
): Promise<CommitReport> {
  const report: CommitReport = { kind, inserted: 0, updated: 0, attached: 0, relationships: 0, downgraded: 0, skipped: 0, errors: [] };
  const rulesTierByType = rules.tierByType as Record<string, 1 | 2 | 3 | 4>;

  // Pass 1: parse + upsert core rows (no relationships yet)
  type Row = z.infer<typeof destinationRowSchema>;
  const parsed: Array<{ index: number; row: Row }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = destinationRowSchema.safeParse(rows[i]);
    if (!r.success) {
      report.skipped++;
      report.errors.push({ index: i, message: r.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") });
      continue;
    }
    parsed.push({ index: i, row: r.data });
  }

  // Determine effective tier per row (never above ruleset cap, always noindex on import if autoNoindex)
  const idBySlug = new Map<string, string>();       // "type:slug" -> id
  for (const { index, row } of parsed) {
    const requestedTier = row.seo_tier ?? 4;
    const cap = rulesTierByType[kind] ?? rules.defaultTier ?? 4;
    // Never *promote* on import — pick the higher (less indexable) of requested and cap.
    const effectiveTier = Math.max(requestedTier, cap) as 1 | 2 | 3 | 4;
    if (effectiveTier !== requestedTier) report.downgraded++;

    const payload = {
      type: kind,
      slug: row.slug,
      name: row.name,
      display_name: row.display_name ?? null,
      short_name: row.short_name ?? null,
      country: row.country,
      region: row.region ?? null,
      council: row.council ?? null,
      town: row.town ?? null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      place_id: row.place_id ?? null,
      keywords: row.keywords ?? [],
      synonyms: row.synonyms ?? [],
      seo_tier: effectiveTier,
      // Guard invariant: tier 1 requires a linked_page_id; imports never satisfy that,
      // so anything that came in as tier 1 without a page falls back to tier 2.
      noindex: rules.autoNoindex ? true : effectiveTier !== 1,
      active: true,
      meta: (row.meta ?? {}) as Record<string, unknown>,
    };

    // Route-specific: derive from/to into meta
    if (kind === "route" && row.from_slug && row.to_slug) {
      payload.meta = {
        ...payload.meta,
        from_slug: row.from_slug,
        from_type: row.from_type ?? "town",
        to_slug: row.to_slug,
        to_type: row.to_type ?? "town",
      };
    }

    // Enforce publish guard for tier 1: downgrade to 2 if no linked page yet.
    if (payload.seo_tier === 1) { payload.seo_tier = 2; payload.noindex = true; report.downgraded++; }

    // Upsert by (type, slug)
    const { data: existing } = await supabase
      .from("destinations").select("id").eq("type", kind).eq("slug", row.slug).maybeSingle();
    const existingId = (existing as { id?: string } | null)?.id;
    if (existingId) {
      const { error } = await supabase.from("destinations").update(payload).eq("id", existingId);
      if (error) { report.skipped++; report.errors.push({ index, message: String((error as { message?: string }).message) }); continue; }
      report.updated++;
      idBySlug.set(`${kind}:${row.slug}`, existingId);
    } else {
      const { data: ins, error } = await supabase.from("destinations").insert(payload).select("id").limit(1) as unknown as { data: Array<{ id: string }>; error: unknown };
      if (error || !ins?.[0]?.id) {
        report.skipped++;
        report.errors.push({ index, message: String((error as { message?: string })?.message ?? "insert failed") });
        continue;
      }
      report.inserted++;
      idBySlug.set(`${kind}:${row.slug}`, ins[0].id);
    }
  }

  // Pass 2: resolve parents + relationship references now that all rows exist.
  const allRefs = new Set<string>();
  for (const { row } of parsed) {
    if (row.parent_slug && row.parent_type) allRefs.add(`${row.parent_type}:${row.parent_slug}`);
    for (const list of ["nearby", "popular_routes", "related_services"] as const) {
      for (const ref of row[list] ?? []) if (ref.includes(":")) allRefs.add(ref);
    }
    if (kind === "route") {
      if (row.from_type && row.from_slug) allRefs.add(`${row.from_type}:${row.from_slug}`);
      if (row.to_type && row.to_slug) allRefs.add(`${row.to_type}:${row.to_slug}`);
    }
  }
  const idLookup = await lookupIds(supabase, allRefs);
  for (const [k, v] of idLookup) idBySlug.set(k, v);

  // Pass 3: write parents + relationships + keyword/tag attachments
  const relRows: Array<{ from_id: string; to_id: string; rel_type: string; rank: number }> = [];
  for (const { row } of parsed) {
    const selfId = idBySlug.get(`${kind}:${row.slug}`);
    if (!selfId) continue;

    // Parent
    if (row.parent_slug && row.parent_type) {
      const parentId = idBySlug.get(`${row.parent_type}:${row.parent_slug}`);
      if (parentId && parentId !== selfId) {
        await supabase.from("destinations").update({ parent_id: parentId }).eq("id", selfId);
        relRows.push({ from_id: selfId, to_id: parentId, rel_type: "belongs_to", rank: 0 });
      }
    }

    // Relationships from list columns
    for (const [list, rel] of [
      ["nearby", "nearby"],
      ["popular_routes", "popular_route"],
      ["related_services", "related_service"],
    ] as const) {
      let rank = 10;
      for (const ref of row[list] ?? []) {
        if (!ref.includes(":")) continue;
        const toId = idBySlug.get(ref);
        if (toId && toId !== selfId) relRows.push({ from_id: selfId, to_id: toId, rel_type: rel, rank: rank++ });
      }
    }

    // Route endpoints
    if (kind === "route" && row.from_type && row.from_slug && row.to_type && row.to_slug) {
      const fromId = idBySlug.get(`${row.from_type}:${row.from_slug}`);
      const toId = idBySlug.get(`${row.to_type}:${row.to_slug}`);
      if (fromId) relRows.push({ from_id: selfId, to_id: fromId, rel_type: "belongs_to", rank: 0 });
      if (toId) relRows.push({ from_id: selfId, to_id: toId, rel_type: "belongs_to", rank: 1 });
      if (fromId && toId) relRows.push({ from_id: fromId, to_id: toId, rel_type: "popular_route", rank: 10 });
    }

    // Keyword / tag / intent attachments
    if (row.keywords?.length) report.attached += await attachTaxonomy(supabase, "keyword", selfId, row.keywords);
    if (row.tags?.length) report.attached += await attachTaxonomy(supabase, "tag", selfId, row.tags);
    if (row.search_intents?.length) report.attached += await attachTaxonomy(supabase, "search_intent", selfId, row.search_intents);
  }

  if (relRows.length) {
    // Dedupe on (from,to,rel) to avoid conflict noise
    const seen = new Set<string>();
    const uniq = relRows.filter((r) => {
      const k = `${r.from_id}:${r.to_id}:${r.rel_type}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // Upsert in chunks
    for (let i = 0; i < uniq.length; i += 500) {
      const slice = uniq.slice(i, i + 500);
      const { error } = await supabase.from("destination_relationships").upsert(slice, { onConflict: "from_id,to_id,rel_type" });
      if (!error) report.relationships += slice.length;
    }
  }

  return report;
}

async function commitKeywords(supabase: SupabaseLike, rows: unknown[]): Promise<CommitReport> {
  const report: CommitReport = { kind: "keyword", inserted: 0, updated: 0, attached: 0, relationships: 0, downgraded: 0, skipped: 0, errors: [] };
  const parsed: Array<{ index: number; row: z.infer<typeof keywordRowSchema> }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = keywordRowSchema.safeParse(rows[i]);
    if (!r.success) {
      report.skipped++;
      report.errors.push({ index: i, message: r.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") });
      continue;
    }
    parsed.push({ index: i, row: r.data });
  }

  // Bulk upsert to taxonomy_keywords by normalized value.
  const payload = parsed.map(({ row }) => ({ keyword: row.keyword, category: row.category ?? null, notes: row.notes ?? null }));
  if (payload.length) {
    // Dedup within the batch by normalized value
    const seen = new Map<string, typeof payload[0]>();
    for (const p of payload) seen.set(p.keyword.trim().toLowerCase(), p);
    const uniq = [...seen.values()];
    const { error } = await supabase.from("taxonomy_keywords").upsert(uniq, { onConflict: "normalized" });
    if (error) throw new Error(String((error as { message?: string }).message ?? "keyword upsert failed"));
    report.inserted = uniq.length;
  }

  // Attach to destinations if attach_to_* provided
  const refKeys = new Set<string>();
  for (const { row } of parsed) if (row.attach_to_slug && row.attach_to_type) refKeys.add(`${row.attach_to_type}:${row.attach_to_slug}`);
  const idLookup = await lookupIds(supabase, refKeys);

  // Fetch keyword ids by normalized value
  const norms = [...new Set(parsed.map((p) => p.row.keyword.trim().toLowerCase()))];
  const kwIdByNorm = new Map<string, string>();
  for (let i = 0; i < norms.length; i += 300) {
    const slice = norms.slice(i, i + 300);
    const { data } = await supabase.from("taxonomy_keywords").select("id,normalized").in("normalized", slice);
    for (const r of ((data as Array<{ id: string; normalized: string }>) ?? [])) kwIdByNorm.set(r.normalized, r.id);
  }

  const attachRows: Array<{ destination_id: string; keyword_id: string; weight: number }> = [];
  for (const { row } of parsed) {
    if (!row.attach_to_slug || !row.attach_to_type) continue;
    const destId = idLookup.get(`${row.attach_to_type}:${row.attach_to_slug}`);
    const kwId = kwIdByNorm.get(row.keyword.trim().toLowerCase());
    if (destId && kwId) attachRows.push({ destination_id: destId, keyword_id: kwId, weight: row.weight });
  }
  if (attachRows.length) {
    for (let i = 0; i < attachRows.length; i += 500) {
      const slice = attachRows.slice(i, i + 500);
      const { error } = await supabase.from("destination_keywords").upsert(slice, { onConflict: "destination_id,keyword_id" });
      if (!error) report.attached += slice.length;
    }
  }
  return report;
}

async function commitTags(supabase: SupabaseLike, rows: unknown[]): Promise<CommitReport> {
  const report: CommitReport = { kind: "tag", inserted: 0, updated: 0, attached: 0, relationships: 0, downgraded: 0, skipped: 0, errors: [] };
  const parsed: Array<{ index: number; row: z.infer<typeof tagRowSchema> }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = tagRowSchema.safeParse(rows[i]);
    if (!r.success) { report.skipped++; report.errors.push({ index: i, message: r.error.issues[0]?.message ?? "invalid" }); continue; }
    parsed.push({ index: i, row: r.data });
  }
  const uniq = new Map<string, { tag: string; description: string | null }>();
  for (const { row } of parsed) uniq.set(row.tag.trim().toLowerCase(), { tag: row.tag, description: row.description ?? null });
  if (uniq.size) {
    const { error } = await supabase.from("taxonomy_tags").upsert([...uniq.values()], { onConflict: "normalized" });
    if (error) throw new Error(String((error as { message?: string }).message ?? "tag upsert failed"));
    report.inserted = uniq.size;
  }
  // Attach
  const refKeys = new Set<string>();
  for (const { row } of parsed) if (row.attach_to_slug && row.attach_to_type) refKeys.add(`${row.attach_to_type}:${row.attach_to_slug}`);
  const idLookup = await lookupIds(supabase, refKeys);
  const norms = [...new Set(parsed.map((p) => p.row.tag.trim().toLowerCase()))];
  const tagIdByNorm = new Map<string, string>();
  for (let i = 0; i < norms.length; i += 300) {
    const { data } = await supabase.from("taxonomy_tags").select("id,normalized").in("normalized", norms.slice(i, i + 300));
    for (const r of ((data as Array<{ id: string; normalized: string }>) ?? [])) tagIdByNorm.set(r.normalized, r.id);
  }
  const attach: Array<{ destination_id: string; tag_id: string }> = [];
  for (const { row } of parsed) {
    if (!row.attach_to_slug || !row.attach_to_type) continue;
    const destId = idLookup.get(`${row.attach_to_type}:${row.attach_to_slug}`);
    const tagId = tagIdByNorm.get(row.tag.trim().toLowerCase());
    if (destId && tagId) attach.push({ destination_id: destId, tag_id: tagId });
  }
  if (attach.length) {
    for (let i = 0; i < attach.length; i += 500) {
      const { error } = await supabase.from("destination_tags").upsert(attach.slice(i, i + 500), { onConflict: "destination_id,tag_id" });
      if (!error) report.attached += Math.min(500, attach.length - i);
    }
  }
  return report;
}

async function commitSearchIntents(supabase: SupabaseLike, rows: unknown[]): Promise<CommitReport> {
  const report: CommitReport = { kind: "search_intent", inserted: 0, updated: 0, attached: 0, relationships: 0, downgraded: 0, skipped: 0, errors: [] };
  const parsed: Array<{ row: z.infer<typeof searchIntentRowSchema> }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = searchIntentRowSchema.safeParse(rows[i]);
    if (!r.success) { report.skipped++; report.errors.push({ index: i, message: r.error.issues[0]?.message ?? "invalid" }); continue; }
    parsed.push({ row: r.data });
  }
  const uniq = new Map<string, { intent: string; description: string | null }>();
  for (const { row } of parsed) uniq.set(row.intent.trim().toLowerCase(), { intent: row.intent, description: row.description ?? null });
  if (uniq.size) {
    const { error } = await supabase.from("taxonomy_search_intents").upsert([...uniq.values()], { onConflict: "normalized" });
    if (error) throw new Error(String((error as { message?: string }).message ?? "search_intent upsert failed"));
    report.inserted = uniq.size;
  }
  // Attach same pattern as tags
  const refKeys = new Set<string>();
  for (const { row } of parsed) if (row.attach_to_slug && row.attach_to_type) refKeys.add(`${row.attach_to_type}:${row.attach_to_slug}`);
  const idLookup = await lookupIds(supabase, refKeys);
  const norms = [...new Set(parsed.map((p) => p.row.intent.trim().toLowerCase()))];
  const idByNorm = new Map<string, string>();
  for (let i = 0; i < norms.length; i += 300) {
    const { data } = await supabase.from("taxonomy_search_intents").select("id,normalized").in("normalized", norms.slice(i, i + 300));
    for (const r of ((data as Array<{ id: string; normalized: string }>) ?? [])) idByNorm.set(r.normalized, r.id);
  }
  const attach: Array<{ destination_id: string; intent_id: string; priority: number }> = [];
  for (const { row } of parsed) {
    if (!row.attach_to_slug || !row.attach_to_type) continue;
    const destId = idLookup.get(`${row.attach_to_type}:${row.attach_to_slug}`);
    const id = idByNorm.get(row.intent.trim().toLowerCase());
    if (destId && id) attach.push({ destination_id: destId, intent_id: id, priority: row.priority });
  }
  if (attach.length) {
    for (let i = 0; i < attach.length; i += 500) {
      const { error } = await supabase.from("destination_search_intents").upsert(attach.slice(i, i + 500), { onConflict: "destination_id,intent_id" });
      if (!error) report.attached += Math.min(500, attach.length - i);
    }
  }
  return report;
}

async function commitRelationships(supabase: SupabaseLike, rows: unknown[]): Promise<CommitReport> {
  const report: CommitReport = { kind: "relationship", inserted: 0, updated: 0, attached: 0, relationships: 0, downgraded: 0, skipped: 0, errors: [] };
  const parsed: Array<{ index: number; row: z.infer<typeof relationshipRowSchema> }> = [];
  const refs = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const r = relationshipRowSchema.safeParse(rows[i]);
    if (!r.success) { report.skipped++; report.errors.push({ index: i, message: r.error.issues[0]?.message ?? "invalid" }); continue; }
    parsed.push({ index: i, row: r.data });
    refs.add(`${r.data.from_type}:${r.data.from_slug}`);
    refs.add(`${r.data.to_type}:${r.data.to_slug}`);
  }
  const idLookup = await lookupIds(supabase, refs);
  const relRows = [];
  for (const { index, row } of parsed) {
    const fromId = idLookup.get(`${row.from_type}:${row.from_slug}`);
    const toId = idLookup.get(`${row.to_type}:${row.to_slug}`);
    if (!fromId || !toId) { report.skipped++; report.errors.push({ index, message: "endpoint not found" }); continue; }
    if (fromId === toId) { report.skipped++; report.errors.push({ index, message: "self-relationship" }); continue; }
    relRows.push({ from_id: fromId, to_id: toId, rel_type: row.rel_type, distance_miles: row.distance_miles ?? null, rank: row.rank });
  }
  for (let i = 0; i < relRows.length; i += 500) {
    const slice = relRows.slice(i, i + 500);
    const { error } = await supabase.from("destination_relationships").upsert(slice, { onConflict: "from_id,to_id,rel_type" });
    if (!error) report.relationships += slice.length;
  }
  return report;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function lookupIds(supabase: SupabaseLike, keys: Set<string>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!keys.size) return out;
  const byType = new Map<string, string[]>();
  for (const k of keys) {
    const [t, s] = k.split(":");
    if (!t || !s) continue;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(s);
  }
  for (const [t, slugs] of byType) {
    for (let i = 0; i < slugs.length; i += 300) {
      const { data } = await supabase.from("destinations").select("id,type,slug").eq("type", t).in("slug", slugs.slice(i, i + 300));
      for (const r of ((data as Array<{ id: string; type: string; slug: string }>) ?? [])) {
        out.set(`${r.type}:${r.slug}`, r.id);
      }
    }
  }
  return out;
}

/** Attach an inline list of keyword/tag/intent strings to a destination.
 *  Ensures each item exists in the appropriate taxonomy table, then upserts the
 *  junction row. Returns count of junction rows written. */
async function attachTaxonomy(
  supabase: SupabaseLike,
  kind: "keyword" | "tag" | "search_intent",
  destinationId: string,
  values: string[],
): Promise<number> {
  const table = kind === "keyword" ? "taxonomy_keywords" : kind === "tag" ? "taxonomy_tags" : "taxonomy_search_intents";
  const junction = kind === "keyword" ? "destination_keywords" : kind === "tag" ? "destination_tags" : "destination_search_intents";
  const valueCol = kind === "keyword" ? "keyword" : kind === "tag" ? "tag" : "intent";
  const junctionCol = kind === "keyword" ? "keyword_id" : kind === "tag" ? "tag_id" : "intent_id";

  const uniq = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (!uniq.length) return 0;
  // Upsert taxonomy rows
  const payload = uniq.map((v) => ({ [valueCol]: v }));
  await supabase.from(table).upsert(payload, { onConflict: "normalized" });
  const norms = uniq.map((v) => v.toLowerCase());
  const idByNorm = new Map<string, string>();
  for (let i = 0; i < norms.length; i += 300) {
    const { data } = await supabase.from(table).select("id,normalized").in("normalized", norms.slice(i, i + 300));
    for (const r of ((data as Array<{ id: string; normalized: string }>) ?? [])) idByNorm.set(r.normalized, r.id);
  }
  const rows = uniq.map((v) => idByNorm.get(v.toLowerCase())).filter((id): id is string => !!id).map((id) => ({
    destination_id: destinationId, [junctionCol]: id,
  }));
  if (!rows.length) return 0;
  const { error } = await supabase.from(junction).upsert(rows, { onConflict: `destination_id,${junctionCol}` });
  return error ? 0 : rows.length;
}

/* ------------------------------------------------------------------ */
/* Auto-relationship computer (Haversine)                              */
/* ------------------------------------------------------------------ */
export const computeAutoRelationships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope?: "all" | "recent"; radiusMiles?: number; maxPerEntity?: number }) =>
    z.object({
      scope: z.enum(["all", "recent"]).default("all"),
      radiusMiles: z.number().min(0).max(200).optional(),
      maxPerEntity: z.number().int().min(1).max(50).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ nearby: number; nearestAirport: number; nearestStation: number; nearestHospital: number; nearestUniversity: number }> => {
    await assertAdmin(context);
    const supabase = context.supabase as SupabaseLike;
    const rules = await loadRuleset(supabase);
    const radius = data.radiusMiles ?? rules.nearbyRadiusMiles;
    const cap = data.maxPerEntity ?? rules.nearbyMaxPerEntity;

    // Fetch all active rows with coords. In production >10k, this pull is still small
    // (each row ~200 bytes for the projected fields).
    const { data: raw } = await supabase.from("destinations").select("id,type,lat,lng").limit(50000);
    type Row = { id: string; type: string; lat: number | null; lng: number | null };
    const rows = ((raw as Row[]) ?? []).filter((r) => r.lat != null && r.lng != null);
    const nearbyEdges: Array<{ from_id: string; to_id: string; rel_type: string; distance_miles: number; rank: number }> = [];
    const nearestEdges: Array<{ from_id: string; to_id: string; rel_type: string; distance_miles: number; rank: number }> = [];

    const airports = rows.filter((r) => r.type === "airport");
    const stations = rows.filter((r) => r.type === "station" || r.type === "bus_station");
    const hospitals = rows.filter((r) => r.type === "hospital");
    const universities = rows.filter((r) => r.type === "university" || r.type === "college");

    function haversine(a: Row, b: Row): number {
      const R = 3958.7613; // miles
      const toRad = (x: number) => (x * Math.PI) / 180;
      const dLat = toRad((b.lat as number) - (a.lat as number));
      const dLng = toRad((b.lng as number) - (a.lng as number));
      const lat1 = toRad(a.lat as number), lat2 = toRad(b.lat as number);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function nearest(from: Row, pool: Row[]): { row: Row; d: number } | null {
      let best: { row: Row; d: number } | null = null;
      for (const p of pool) {
        if (p.id === from.id) continue;
        const d = haversine(from, p);
        if (!best || d < best.d) best = { row: p, d };
      }
      return best;
    }

    let counts = { nearby: 0, nearestAirport: 0, nearestStation: 0, nearestHospital: 0, nearestUniversity: 0 };
    for (const from of rows) {
      // Nearby (same region peers within radius, cap N)
      const candidates: Array<{ to: Row; d: number }> = [];
      for (const to of rows) {
        if (to.id === from.id) continue;
        const d = haversine(from, to);
        if (d <= radius) candidates.push({ to, d });
      }
      candidates.sort((a, b) => a.d - b.d);
      candidates.slice(0, cap).forEach(({ to, d }, i) => {
        nearbyEdges.push({ from_id: from.id, to_id: to.id, rel_type: "nearby", distance_miles: Number(d.toFixed(2)), rank: i });
        counts.nearby++;
      });

      // Nearest of each type (skip if `from` itself is that type — no self-family)
      if (from.type !== "airport") {
        const n = nearest(from, airports);
        if (n) { nearestEdges.push({ from_id: from.id, to_id: n.row.id, rel_type: "nearest_airport", distance_miles: Number(n.d.toFixed(2)), rank: 0 }); counts.nearestAirport++; }
      }
      if (from.type !== "station" && from.type !== "bus_station") {
        const n = nearest(from, stations);
        if (n) { nearestEdges.push({ from_id: from.id, to_id: n.row.id, rel_type: "nearest_station", distance_miles: Number(n.d.toFixed(2)), rank: 0 }); counts.nearestStation++; }
      }
      if (from.type !== "hospital") {
        const n = nearest(from, hospitals);
        if (n) { nearestEdges.push({ from_id: from.id, to_id: n.row.id, rel_type: "nearest_hospital", distance_miles: Number(n.d.toFixed(2)), rank: 0 }); counts.nearestHospital++; }
      }
      if (from.type !== "university" && from.type !== "college") {
        const n = nearest(from, universities);
        if (n) { nearestEdges.push({ from_id: from.id, to_id: n.row.id, rel_type: "nearest_university", distance_miles: Number(n.d.toFixed(2)), rank: 0 }); counts.nearestUniversity++; }
      }
    }

    // Bulk upsert
    for (const batch of [nearbyEdges, nearestEdges]) {
      for (let i = 0; i < batch.length; i += 500) {
        await supabase.from("destination_relationships").upsert(batch.slice(i, i + 500), { onConflict: "from_id,to_id,rel_type" });
      }
    }
    return counts;
  });
