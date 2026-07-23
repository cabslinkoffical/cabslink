/**
 * Publishing engine — server functions for reviewing, publishing and
 * safely bulk-importing destinations. All mutating calls require an
 * authenticated admin (RLS enforced via has_role check).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateQuality, TIER1_THRESHOLD, type QualityReport } from "@/lib/seo/quality";
import {
  DESTINATION_TYPES,
  type Destination,
  type DestinationType,
} from "@/lib/destinations.functions";

const FIELDS =
  "id,type,slug,name,display_name,short_name,country,region,council,town,parent_id,lat,lng,place_id,keywords,synonyms,nearby_ids,popular_route_ids,related_service_ids,seo_tier,noindex,active,linked_page_id,meta,updated_at";

async function assertAdmin(context: { supabase: ReturnType<typeof Object>; userId: string }) {
  const sb = context.supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

/** Evaluate the current quality of a destination without changing it. */
export const evaluateDestinationQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<QualityReport & { destination: Destination }> => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("destinations")
      .select(FIELDS)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Destination not found");
    const d = row as Destination;
    return { destination: d, ...evaluateQuality(d) };
  });

/** Promote a destination to Tier 1 (indexed). Refuses if quality is below threshold. */
export const publishDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; force?: boolean }) =>
    z.object({ id: z.string().uuid(), force: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; report: QualityReport }> => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("destinations")
      .select(FIELDS)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Destination not found");
    const d = row as Destination;
    const report = evaluateQuality(d);
    if (!report.meetsThreshold && !data.force) {
      const err = new Error(
        `Quality ${report.score}/${TIER1_THRESHOLD}. Missing: ${report.missing.join(", ") || "none"}. Fix before publishing (or pass force=true to override).`,
      );
      (err as unknown as { report: QualityReport }).report = report;
      throw err;
    }
    const { error: uerr } = await context.supabase
      .from("destinations")
      .update({ seo_tier: 1, noindex: false, active: true })
      .eq("id", data.id);
    if (uerr) throw new Error(uerr.message);
    return { ok: true, report };
  });

/** Move a destination out of Tier 1 (back to Hub or Draft) and set noindex. */
export const unpublishDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; targetTier?: 2 | 3 | 4; reason?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        targetTier: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("destinations")
      .update({ seo_tier: data.targetTier ?? 4, noindex: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Row shape accepted by bulk import. All new imports land as Tier 4 (Draft)
 * with noindex=true unless the importer explicitly sets a lower-risk tier.
 */
const ImportRow = z.object({
  type: z.enum(DESTINATION_TYPES as unknown as [DestinationType, ...DestinationType[]]),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "kebab-case slugs only"),
  name: z.string().min(1).max(200),
  display_name: z.string().max(200).optional(),
  short_name: z.string().max(80).optional(),
  country: z.string().length(2).default("GB"),
  region: z.string().max(120).optional(),
  council: z.string().max(120).optional(),
  town: z.string().max(120).optional(),
  parent_slug: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  place_id: z.string().max(200).optional(),
  keywords: z.array(z.string().max(80)).max(30).optional(),
  synonyms: z.array(z.string().max(80)).max(30).optional(),
  seo_tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(4),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type ImportRow = z.infer<typeof ImportRow>;

type DryRunOutcome = {
  index: number;
  type: DestinationType;
  slug: string;
  status: "new" | "update" | "duplicate" | "invalid";
  quality: QualityReport | null;
  errors: string[];
};

/** Validate + evaluate proposed rows without writing anything. */
export const importDestinationsDryRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: unknown[] }) =>
    z.object({ rows: z.array(z.unknown()).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ outcomes: DryRunOutcome[] }> => {
    await assertAdmin(context);
    const seen = new Set<string>();
    const outcomes: DryRunOutcome[] = [];

    // Fetch existing (type, slug) pairs referenced in the batch.
    const parsedRows = data.rows.map((r) => {
      const parsed = ImportRow.safeParse(r);
      return parsed;
    });
    const keys = parsedRows
      .map((p) => (p.success ? `${p.data.type}:${p.data.slug}` : null))
      .filter((k): k is string => !!k);
    const existing = new Set<string>();
    if (keys.length) {
      const types = Array.from(new Set(keys.map((k) => k.split(":")[0])));
      const { data: rows } = await context.supabase
        .from("destinations")
        .select("type,slug")
        .in("type", types);
      for (const r of (rows ?? []) as Array<{ type: string; slug: string }>) {
        existing.add(`${r.type}:${r.slug}`);
      }
    }

    parsedRows.forEach((parsed, index) => {
      if (!parsed.success) {
        outcomes.push({
          index,
          type: "location",
          slug: "",
          status: "invalid",
          quality: null,
          errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
        return;
      }
      const row = parsed.data;
      const key = `${row.type}:${row.slug}`;
      const errors: string[] = [];
      let status: DryRunOutcome["status"] = existing.has(key) ? "update" : "new";
      if (seen.has(key)) status = "duplicate";
      seen.add(key);

      const shape: Destination = {
        id: "00000000-0000-0000-0000-000000000000",
        type: row.type,
        slug: row.slug,
        name: row.name,
        display_name: row.display_name ?? null,
        short_name: row.short_name ?? null,
        country: row.country,
        region: row.region ?? null,
        council: row.council ?? null,
        town: row.town ?? null,
        parent_id: null,
        lat: row.lat ?? null,
        lng: row.lng ?? null,
        place_id: row.place_id ?? null,
        keywords: row.keywords ?? [],
        synonyms: row.synonyms ?? [],
        nearby_ids: [],
        popular_route_ids: [],
        related_service_ids: [],
        seo_tier: row.seo_tier,
        noindex: row.seo_tier !== 1,
        active: true,
        linked_page_id: null,
        meta: (row.meta ?? {}) as Destination["meta"],
        updated_at: new Date().toISOString(),
      };
      const quality = evaluateQuality(shape);
      if (row.seo_tier === 1 && !quality.meetsThreshold) {
        errors.push(`Row requests Tier 1 but quality ${quality.score} < ${TIER1_THRESHOLD}. Import as Tier 4 and promote after enrichment.`);
      }
      outcomes.push({ index, type: row.type, slug: row.slug, status, quality, errors });
    });
    return { outcomes };
  });

/**
 * Bulk upsert. Any row requesting Tier 1 without meeting quality is
 * automatically downgraded to Tier 4 draft with noindex=true — safe by
 * default; publisher promotes rows manually via publishDestination.
 */
export const bulkImportDestinations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: unknown[] }) =>
    z.object({ rows: z.array(z.unknown()).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ inserted: number; updated: number; downgraded: number; skipped: number }> => {
    await assertAdmin(context);
    let inserted = 0, updated = 0, downgraded = 0, skipped = 0;

    for (const raw of data.rows) {
      const parsed = ImportRow.safeParse(raw);
      if (!parsed.success) { skipped++; continue; }
      const row = parsed.data;

      // Auto-downgrade if requesting Tier 1 without meeting threshold.
      const shape: Destination = {
        id: "00000000-0000-0000-0000-000000000000",
        type: row.type, slug: row.slug, name: row.name,
        display_name: row.display_name ?? null,
        short_name: row.short_name ?? null,
        country: row.country,
        region: row.region ?? null, council: row.council ?? null, town: row.town ?? null,
        parent_id: null, lat: row.lat ?? null, lng: row.lng ?? null,
        place_id: row.place_id ?? null,
        keywords: row.keywords ?? [], synonyms: row.synonyms ?? [],
        nearby_ids: [], popular_route_ids: [], related_service_ids: [],
        seo_tier: row.seo_tier, noindex: row.seo_tier !== 1, active: true,
        linked_page_id: null,
        meta: (row.meta ?? {}) as Destination["meta"],
        updated_at: new Date().toISOString(),
      };
      let tier = row.seo_tier;
      if (tier === 1 && !evaluateQuality(shape).meetsThreshold) {
        tier = 4;
        downgraded++;
      }

      const { data: existing } = await context.supabase
        .from("destinations")
        .select("id")
        .eq("type", row.type)
        .eq("slug", row.slug)
        .maybeSingle();

      const payload = {
        type: row.type,
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
        seo_tier: tier,
        noindex: tier !== 1,
        active: true,
        meta: row.meta ?? {},
      };

      if (existing) {
        const { error } = await context.supabase
          .from("destinations")
          .update(payload)
          .eq("id", (existing as { id: string }).id);
        if (error) { skipped++; continue; }
        updated++;
      } else {
        const { error } = await context.supabase.from("destinations").insert(payload);
        if (error) { skipped++; continue; }
        inserted++;
      }
    }
    return { inserted, updated, downgraded, skipped };
  });
