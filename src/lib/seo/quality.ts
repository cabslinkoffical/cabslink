/**
 * Destination quality evaluator.
 *
 * Runs both server-side (when publishing) and at render time (to force
 * noindex on Tier 1 rows that have drifted below threshold). Pure function —
 * no I/O — so it is safe to import from anywhere.
 */
import type { Destination, DestinationType } from "@/lib/destinations.functions";

export type QualityReport = {
  score: number;              // 0-100
  meetsThreshold: boolean;    // score >= threshold for Tier 1
  effectiveNoindex: boolean;  // true when the page must not be indexed
  missing: string[];          // human-readable missing requirements
  reasons: string[];          // rules that failed
};

/** Minimum score required to promote a destination to Tier 1. */
export const TIER1_THRESHOLD = 70;

const REQUIRED_BY_TYPE: Record<DestinationType, {
  fields: Array<keyof Destination | `meta.${string}`>;
  minSummaryChars?: number;
}> = {
  location:      { fields: ["name", "slug", "country"] },
  region:        { fields: ["name", "slug", "country"] },
  council:       { fields: ["name", "slug", "country"] },
  city:          { fields: ["name", "slug", "country"] },
  town:          { fields: ["name", "slug", "country"] },
  village:       { fields: ["name", "slug", "country"] },
  route:         { fields: ["name", "slug", "meta.from_name", "meta.to_name"] },
  airport:       { fields: ["name", "slug", "lat", "lng", "meta.iata"] },
  station:       { fields: ["name", "slug", "lat", "lng"] },
  cruise_port:   { fields: ["name", "slug", "lat", "lng"] },
  university:    { fields: ["name", "slug", "lat", "lng", "town"] },
  hospital:      { fields: ["name", "slug", "lat", "lng", "town"] },
  corporate:     { fields: ["name", "slug", "town"] },
  business_park: { fields: ["name", "slug", "town"] },
  attraction:    { fields: ["name", "slug", "lat", "lng"] },
  distillery:    { fields: ["name", "slug", "lat", "lng", "region"] },
  service:       { fields: ["name", "slug", "meta.summary"], minSummaryChars: 120 },
  guide:         { fields: ["name", "slug", "meta.summary", "meta.body"], minSummaryChars: 200 },
};

function readField(d: Destination, key: string): unknown {
  if (key.startsWith("meta.")) return (d.meta ?? {})[key.slice(5) as keyof typeof d.meta];
  return (d as unknown as Record<string, unknown>)[key];
}

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Evaluate a destination. */
export function evaluateQuality(d: Destination): QualityReport {
  const missing: string[] = [];
  const reasons: string[] = [];
  const spec = REQUIRED_BY_TYPE[d.type];

  // 1. Required fields per type (40 pts).
  let requiredScore = 40;
  for (const key of spec.fields) {
    if (!hasValue(readField(d, key as string))) {
      missing.push(key as string);
      requiredScore = 0;
    }
  }
  if (spec.minSummaryChars) {
    const summary = String((d.meta as { summary?: string })?.summary ?? "");
    if (summary.trim().length < spec.minSummaryChars) {
      missing.push(`meta.summary (>= ${spec.minSummaryChars} chars)`);
      requiredScore = 0;
    }
  }

  // 2. Enrichment signals (up to 60 pts).
  let enrichment = 0;
  if (hasValue(d.lat) && hasValue(d.lng)) enrichment += 10;
  if ((d.keywords?.length ?? 0) >= 3) enrichment += 10;
  if ((d.nearby_ids?.length ?? 0) >= 3) enrichment += 10;
  if ((d.popular_route_ids?.length ?? 0) >= 3) enrichment += 10;
  if ((d.related_service_ids?.length ?? 0) >= 2) enrichment += 10;
  if (hasValue(d.region) && hasValue(d.town)) enrichment += 5;
  const summary = String((d.meta as { summary?: string })?.summary ?? "");
  if (summary.length >= 160) enrichment += 5;
  enrichment = Math.min(enrichment, 60);

  const score = Math.min(100, requiredScore + enrichment);
  const meetsThreshold = requiredScore > 0 && score >= TIER1_THRESHOLD;
  if (requiredScore === 0) reasons.push("Missing required fields for this destination type.");
  if (requiredScore > 0 && score < TIER1_THRESHOLD)
    reasons.push(`Enrichment score ${score} below Tier 1 threshold ${TIER1_THRESHOLD}.`);

  const effectiveNoindex = d.noindex || d.seo_tier !== 1 || !meetsThreshold;
  return { score, meetsThreshold, effectiveNoindex, missing, reasons };
}
