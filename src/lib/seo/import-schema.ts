/**
 * Import schemas — shared between client (preview) and server (validate + commit).
 * Pure Zod. Safe to import from browser and server.
 */
import { z } from "zod";

/** Every entity kind the universal import engine understands. */
export const IMPORT_KINDS = [
  // Destinations (all persisted in `destinations` table with matching type)
  "service", "region", "council", "city", "town", "village",
  "airport", "route", "station", "bus_station", "cruise_port",
  "university", "college", "hospital", "business_park", "corporate",
  "attraction", "castle", "museum", "hotel", "golf_course",
  "distillery", "brewery", "wedding_venue", "event_venue",
  "car_rental", "campervan_rental", "ferry_terminal",
  "guide", "blog",
  // Taxonomy
  "keyword", "tag", "search_intent",
  // Relationships (optional bulk edge import)
  "relationship",
] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

/** Kinds that land in the destinations table (kind === destination_type). */
export const DESTINATION_KINDS = new Set<ImportKind>([
  "service", "region", "council", "city", "town", "village",
  "airport", "route", "station", "bus_station", "cruise_port",
  "university", "college", "hospital", "business_park", "corporate",
  "attraction", "castle", "museum", "hotel", "golf_course",
  "distillery", "brewery", "wedding_venue", "event_venue",
  "car_rental", "campervan_rental", "ferry_terminal",
  "guide", "blog",
]);

/** Coerce string / array / null into a clean string array. */
const stringList = z.preprocess((v) => {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
}, z.array(z.string().min(1).max(120)).max(200));

const optionalStr = (max: number) =>
  z.preprocess((v) => (v == null || v === "" ? undefined : String(v).trim()), z.string().max(max).optional());

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Shared destination row shape (all destination_type kinds). */
export const destinationRowSchema = z.object({
  slug: z.string().min(1).max(200).regex(SLUG, "kebab-case slugs only (a-z, 0-9, hyphen)"),
  name: z.string().min(1).max(200),
  display_name: optionalStr(200),
  short_name: optionalStr(80),
  country: z.preprocess((v) => (v == null || v === "" ? "GB" : String(v).trim().toUpperCase()), z.string().length(2)),
  region: optionalStr(120),
  council: optionalStr(120),
  town: optionalStr(120),
  parent_slug: optionalStr(200),
  parent_type: optionalStr(60),
  lat: z.preprocess((v) => (v == null || v === "" ? undefined : Number(v)), z.number().min(-90).max(90).optional()),
  lng: z.preprocess((v) => (v == null || v === "" ? undefined : Number(v)), z.number().min(-180).max(180).optional()),
  place_id: optionalStr(200),
  keywords: stringList.optional(),
  synonyms: stringList.optional(),
  tags: stringList.optional(),
  search_intents: stringList.optional(),
  nearby: stringList.optional(),
  popular_routes: stringList.optional(),
  related_services: stringList.optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  // Requested tier; import engine may downgrade based on ruleset / quality.
  seo_tier: z.preprocess((v) => (v == null || v === "" ? 4 : Number(v)), z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])).default(4),
  // Route-specific hints (only used when kind === 'route')
  from_slug: optionalStr(200),
  from_type: optionalStr(60),
  to_slug: optionalStr(200),
  to_type: optionalStr(60),
});
export type DestinationRow = z.infer<typeof destinationRowSchema>;

export const keywordRowSchema = z.object({
  keyword: z.string().min(1).max(120),
  category: optionalStr(60),
  notes: optionalStr(500),
  attach_to_slug: optionalStr(200),
  attach_to_type: optionalStr(60),
  weight: z.preprocess((v) => (v == null || v === "" ? 1 : Number(v)), z.number().int().min(1).max(10)).default(1),
});
export type KeywordRow = z.infer<typeof keywordRowSchema>;

export const tagRowSchema = z.object({
  tag: z.string().min(1).max(120),
  description: optionalStr(500),
  attach_to_slug: optionalStr(200),
  attach_to_type: optionalStr(60),
});
export type TagRow = z.infer<typeof tagRowSchema>;

export const searchIntentRowSchema = z.object({
  intent: z.string().min(1).max(120),
  description: optionalStr(500),
  attach_to_slug: optionalStr(200),
  attach_to_type: optionalStr(60),
  priority: z.preprocess((v) => (v == null || v === "" ? 1 : Number(v)), z.number().int().min(1).max(10)).default(1),
});
export type SearchIntentRow = z.infer<typeof searchIntentRowSchema>;

export const relationshipRowSchema = z.object({
  from_slug: z.string().min(1),
  from_type: z.string().min(1),
  to_slug: z.string().min(1),
  to_type: z.string().min(1),
  rel_type: z.enum([
    "nearby", "serves", "belongs_to", "popular_route",
    "nearest_airport", "nearest_station", "nearest_hospital", "nearest_university",
    "related_service", "related_attraction", "related_hotel", "related_business_park",
  ]),
  distance_miles: z.preprocess((v) => (v == null || v === "" ? undefined : Number(v)), z.number().min(0).max(20000).optional()),
  rank: z.preprocess((v) => (v == null || v === "" ? 100 : Number(v)), z.number().int().min(0).max(10000)).default(100),
});
export type RelationshipRow = z.infer<typeof relationshipRowSchema>;

/** Configurable classification ruleset stored in `private_settings.seo_import_rules`. */
export const importRulesetSchema = z.object({
  // Every import lands at this tier unless per-type override exists.
  defaultTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(4),
  // Per-type default tier (never higher than what quality allows at publish time).
  tierByType: z.record(z.string(), z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])).default({}),
  // If true, everything imported stays noindex until manually promoted.
  autoNoindex: z.boolean().default(true),
  // Auto-relationships (Haversine).
  nearbyRadiusMiles: z.number().min(0).max(200).default(15),
  nearbyMaxPerEntity: z.number().int().min(0).max(50).default(8),
  computeNearestOnImport: z.boolean().default(false),
});
export type ImportRuleset = z.infer<typeof importRulesetSchema>;

export const DEFAULT_RULESET: ImportRuleset = importRulesetSchema.parse({});

/** Validate a single row against the schema for a kind. Returns issues (empty = valid). */
export function validateRow(kind: ImportKind, raw: unknown): { ok: true; row: unknown } | { ok: false; errors: string[] } {
  const schema =
    DESTINATION_KINDS.has(kind) ? destinationRowSchema :
    kind === "keyword" ? keywordRowSchema :
    kind === "tag" ? tagRowSchema :
    kind === "search_intent" ? searchIntentRowSchema :
    kind === "relationship" ? relationshipRowSchema :
    null;
  if (!schema) return { ok: false, errors: [`Unsupported import kind: ${kind}`] };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`) };
  }
  return { ok: true, row: parsed.data };
}
