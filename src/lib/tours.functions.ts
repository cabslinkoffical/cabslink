/**
 * Public tour data-contract server functions.
 *
 * These are the ONLY public read paths for scenic route templates. They use
 * the server publishable client + the DB RLS policy that restricts rows to
 * `active AND published`. Admin-only fields are stripped at projection time.
 *
 * Starting price is served from the cached column on the template. When the
 * cache is empty (invalidated by trigger or never computed) the function
 * lazily recomputes via computeStartingPriceForTemplate and writes the
 * result back with the service-role client. Callers must never sum totals.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Frozen public projection — every new column MUST be added here explicitly.
const LIST_FIELDS =
  "id, slug, name, short_description, hero_image_url, origin_label, destination_label, theme, seasonal_note, featured, long_day, display_order, tour_fee_pence, default_duration_hours, direct_distance_miles_cache, direct_duration_seconds_cache, starting_price_pence_cache, starting_price_currency";


const DETAIL_FIELDS =
  LIST_FIELDS +
  ", description, included, excluded, recommended_vehicle_categories, recommended_start_time, origin_place_id, destination_place_id, default_order_locked";

// POI fields we allow into the public projection. Deliberately excludes
// scenic_score, admin_priority, latitude/longitude, address_label.
const POI_FIELDS =
  "id, slug, name, short_description, category, image_url, recommended_visit_minutes, minimum_visit_minutes, maximum_visit_minutes, stop_fee_pence, parking_fee_pence, admission_note, opening_hours_note, featured, place_id";

export type PublicTourListItem = {
  slug: string;
  name: string;
  short_description: string | null;
  hero_image_url: string | null;
  origin_label: string | null;
  destination_label: string | null;
  theme: string | null;
  seasonal_note: string | null;
  featured: boolean;
  long_day: boolean;
  recommended_stop_count: number;
  starting_price_pence: number | null;
  currency: string;
  direct_distance_miles: number | null;
  direct_duration_seconds: number | null;
};

export type PublicPoiCard = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  category: string | null;
  image_url: string | null;
  recommended_visit_minutes: number;
  minimum_visit_minutes: number;
  maximum_visit_minutes: number;
  stop_fee_pence: number;
  parking_fee_pence: number;
  admission_note: string | null;
  opening_hours_note: string | null;
  featured: boolean;
  place_id: string;
  stop_order: number;
  default_selected: boolean;
  recommended: boolean;
  mandatory: boolean;
};

export type PublicTourDetail = PublicTourListItem & {
  id: string;
  description: string | null;
  included: string[];
  excluded: string[];
  recommended_vehicle_categories: string[];
  recommended_start_time: string | null;
  origin_place_id: string;
  destination_place_id: string;
  default_order_locked: boolean;
  pois: PublicPoiCard[];
  related_slugs: string[];
};

function pickCurrency(row: any): string {
  return (row.starting_price_currency as string | null) ?? "GBP";
}

// Hourly-model fallback: when a template has no cached transfer-style starting
// price we show the cheapest vehicle class's hourly day rate for the tour's
// default day length. This matches what the tour wizard actually charges.
let hourlyRateCache: { at: number; rate: number | null } | null = null;
async function cheapestTourHourlyRate(): Promise<number | null> {
  if (hourlyRateCache && Date.now() - hourlyRateCache.at < 5 * 60_000) return hourlyRateCache.rate;
  let rate: number | null = null;
  try {
    const { loadTourConfig } = await import("@/lib/tour-quote.server");
    const cfg = await loadTourConfig();
    const rates = cfg.classes
      .map((c: any) => Number(c.hourly_rate))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (rates.length) rate = Math.min(...rates);
  } catch (err) {
    console.error("cheapestTourHourlyRate failed", err);
  }
  hourlyRateCache = { at: Date.now(), rate };
  return rate;
}

function hourlyStartingPricePence(row: any, hourlyRate: number | null): number | null {
  if (hourlyRate == null) return null;
  const hours = Number(row.default_duration_hours);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(hourlyRate * hours * 100);
}


function toListItem(row: any, recommendedStopCount: number): PublicTourListItem {
  return {
    slug: row.slug,
    name: row.name,
    short_description: row.short_description ?? null,
    hero_image_url: row.hero_image_url ?? null,
    origin_label: row.origin_label ?? null,
    destination_label: row.destination_label ?? null,
    theme: row.theme ?? null,
    seasonal_note: row.seasonal_note ?? null,
    featured: !!row.featured,
    long_day: !!row.long_day,
    recommended_stop_count: recommendedStopCount,
    starting_price_pence: row.starting_price_pence_cache ?? null,
    currency: pickCurrency(row),
    direct_distance_miles: row.direct_distance_miles_cache ?? null,
    direct_duration_seconds: row.direct_duration_seconds_cache ?? null,
  };
}

export async function listPublishedToursImpl(): Promise<PublicTourListItem[]> {
  const client = serverPublicClient();
  const { data: templates, error } = await client
    .from("scenic_route_templates")
    .select(LIST_FIELDS)
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true });
  if (error) {
    console.error("listPublishedTours failed", error);
    return [];
  }
  const ids = (templates ?? []).map((t: any) => t.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: rows } = await client
      .from("scenic_route_template_pois")
      .select("route_template_id, default_selected, points_of_interest!inner(active)")
      .in("route_template_id", ids);
    for (const r of (rows ?? []) as any[]) {
      if (!r.default_selected) continue;
      if (!r.points_of_interest?.active) continue;
      counts.set(r.route_template_id, (counts.get(r.route_template_id) ?? 0) + 1);
    }
  }
  const rows = (templates ?? []) as any[];
  const needsFallback = rows.some((t) => t.starting_price_pence_cache == null);
  const hourlyRate = needsFallback ? await cheapestTourHourlyRate() : null;
  return rows.map((t: any) => {
    const item = toListItem(t, counts.get(t.id) ?? 0);
    if (item.starting_price_pence == null) {
      item.starting_price_pence = hourlyStartingPricePence(t, hourlyRate);
    }
    return item;
  });

}

export const listPublishedTours = createServerFn({ method: "GET" }).handler(listPublishedToursImpl);

// Cooldown guard: the refresh runs on an unauthenticated public read path, so a
// tour whose price cannot be computed (missing distance, pricing gap) must not
// re-trigger a Maps call + admin write on every single page view.
const refreshCooldown = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 10 * 60_000;

async function refreshStartingPriceCache(templateId: string): Promise<{ price_pence: number | null; currency: string; distance: number | null; duration: number | null }> {
  const last = refreshCooldown.get(templateId) ?? 0;
  if (Date.now() - last < REFRESH_COOLDOWN_MS) {
    return { price_pence: null, currency: "GBP", distance: null, duration: null };
  }
  refreshCooldown.set(templateId, Date.now());
  try {

    const { computeStartingPriceForTemplate } = await import("@/lib/tours-pricing.server");
    const result = await computeStartingPriceForTemplate(templateId);
    if (!result) return { price_pence: null, currency: "GBP", distance: null, duration: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("scenic_route_templates")
      .update({
        starting_price_pence_cache: result.price_pence,
        starting_price_currency: result.currency,
        starting_price_vehicle_id: result.vehicle_id,
        starting_price_calculated_at: new Date().toISOString(),
        direct_distance_miles_cache: result.direct_distance_miles,
        direct_duration_seconds_cache: result.direct_duration_seconds,
      })
      .eq("id", templateId);
    return {
      price_pence: result.price_pence,
      currency: result.currency,
      distance: result.direct_distance_miles,
      duration: result.direct_duration_seconds,
    };
  } catch (err) {
    console.error("refreshStartingPriceCache failed", err);
    return { price_pence: null, currency: "GBP", distance: null, duration: null };
  }
}

const slugSchema = z.object({ slug: z.string().trim().min(1).max(120) });

export async function getPublishedTourBySlugImpl(slug: string): Promise<PublicTourDetail | null> {
  const client = serverPublicClient();
  const { data: template, error } = await client
    .from("scenic_route_templates")
    .select(DETAIL_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !template) return null;

  const { data: joinRows } = await client
    .from("scenic_route_template_pois")
    .select(
      `stop_order, default_selected, recommended, recommended_visit_minutes, points_of_interest!inner(${POI_FIELDS}, active)`,
    )
    .eq("route_template_id", (template as any).id)
    .order("stop_order", { ascending: true });

  const pois: PublicPoiCard[] = (joinRows ?? [])
    .filter((r: any) => r.points_of_interest?.active)
    .map((r: any) => {
      const poi = r.points_of_interest;
      const isMandatory = !!r.recommended && !!r.default_selected;
      return {
        id: poi.id,
        slug: poi.slug,
        name: poi.name,
        short_description: poi.short_description ?? null,
        category: poi.category ?? null,
        image_url: poi.image_url ?? null,
        recommended_visit_minutes: Number(r.recommended_visit_minutes ?? poi.recommended_visit_minutes ?? 0),
        minimum_visit_minutes: Number(poi.minimum_visit_minutes ?? 0),
        maximum_visit_minutes: Number(poi.maximum_visit_minutes ?? 240),
        stop_fee_pence: Number(poi.stop_fee_pence ?? 0),
        parking_fee_pence: Number(poi.parking_fee_pence ?? 0),
        admission_note: poi.admission_note ?? null,
        opening_hours_note: poi.opening_hours_note ?? null,
        featured: !!poi.featured,
        place_id: poi.place_id,
        stop_order: Number(r.stop_order ?? 0),
        default_selected: !!r.default_selected,
        recommended: !!r.recommended,
        mandatory: isMandatory,
      };
    });

  const recommendedCount = pois.filter((p) => p.default_selected).length;

  // Lazy refresh of starting-price cache.
  const t: any = template;
  let cache = {
    price_pence: t.starting_price_pence_cache as number | null,
    currency: pickCurrency(t),
    distance: t.direct_distance_miles_cache as number | null,
    duration: t.direct_duration_seconds_cache as number | null,
  };
  if (cache.price_pence == null) {
    cache = await refreshStartingPriceCache(t.id);
  }

  // Related slugs — up to 3 other published tours by display order.
  const { data: related } = await client
    .from("scenic_route_templates")
    .select("slug")
    .neq("id", t.id)
    .order("display_order", { ascending: true })
    .limit(3);

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    short_description: t.short_description ?? null,
    hero_image_url: t.hero_image_url ?? null,
    origin_label: t.origin_label ?? null,
    destination_label: t.destination_label ?? null,
    theme: t.theme ?? null,
    seasonal_note: t.seasonal_note ?? null,
    featured: !!t.featured,
    long_day: !!t.long_day,
    recommended_stop_count: recommendedCount,
    starting_price_pence: cache.price_pence,
    currency: cache.currency,
    direct_distance_miles: cache.distance,
    direct_duration_seconds: cache.duration,
    description: t.description ?? null,
    included: Array.isArray(t.included) ? (t.included as string[]) : [],
    excluded: Array.isArray(t.excluded) ? (t.excluded as string[]) : [],
    recommended_vehicle_categories: Array.isArray(t.recommended_vehicle_categories)
      ? (t.recommended_vehicle_categories as string[])
      : [],
    recommended_start_time: t.recommended_start_time ?? null,
    origin_place_id: t.origin_place_id,
    destination_place_id: t.destination_place_id,
    default_order_locked: !!t.default_order_locked,
    pois,
    related_slugs: (related ?? []).map((r: any) => r.slug as string),
  };
}

export const getPublishedTourBySlug = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }) => getPublishedTourBySlugImpl(data.slug));

export type ResolvedTourTemplate = {
  templateId: string;
  slug: string;
  name: string;
  pickup: { place_id: string; label: string };
  dropoff: { place_id: string; label: string };
  defaultPois: Array<{ place_id: string; label: string; minutes: number; mandatory: boolean; category: string | null }>;
  allowedPoiPlaceIds: string[];
};

export const resolveTourTemplate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<ResolvedTourTemplate | null> => {
    const detail = await getPublishedTourBySlugImpl(data.slug);
    if (!detail) return null;
    return {
      templateId: detail.id,
      slug: detail.slug,
      name: detail.name,
      pickup: { place_id: detail.origin_place_id, label: detail.origin_label ?? detail.name },
      dropoff: { place_id: detail.destination_place_id, label: detail.destination_label ?? detail.name },
      defaultPois: detail.pois
        .filter((p) => p.default_selected)
        .map((p) => ({
          place_id: p.place_id,
          label: p.name,
          minutes: p.recommended_visit_minutes,
          mandatory: p.mandatory,
          category: p.category,
        })),
      allowedPoiPlaceIds: detail.pois.map((p) => p.place_id),
    };
  });
