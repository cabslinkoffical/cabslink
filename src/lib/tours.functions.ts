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
import { tourPriceCovers, type TourPriceCovers } from "@/lib/tour-price-covers";

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
  "id, slug, name, short_description, hero_image_url, origin_label, destination_label, theme, seasonal_note, featured, long_day, display_order, tour_fee_pence, default_duration_hours, direct_distance_miles_cache, direct_duration_seconds_cache, starting_price_pence_cache, starting_price_currency, signature, theme_group, duration_hours, included_miles, price_mode, auto_price_route_miles, included, included_md";


const DETAIL_FIELDS =
  LIST_FIELDS +
  ", description, included, excluded, recommended_vehicle_categories, recommended_start_time, origin_place_id, destination_place_id, default_order_locked, updated_at, itinerary_md, included_md, excluded_md, suits_md, faq, meta_description";

// POI fields we allow into the public projection. Deliberately excludes
// scenic_score, admin_priority, latitude/longitude, address_label.
const POI_FIELDS =
  "id, slug, name, short_description, category, image_url, recommended_visit_minutes, minimum_visit_minutes, maximum_visit_minutes, stop_fee_pence, parking_fee_pence, admission_note, opening_hours_note, featured, place_id";

export type PublicTourListItem = {
  /** Position of the tour's category in the admin-managed category order (Tours page filters). */
  category_order?: number | null;
  slug: string;
  name: string;
  short_description: string | null;
  hero_image_url: string | null;
  origin_label: string | null;
  destination_label: string | null;
  theme: string | null;
  seasonal_note: string | null;
  featured: boolean;
  /** Shows the "Signature" badge — only when an admin flags it. */
  signature: boolean;
  /** One of at most 7 filter groups. */
  theme_group: string | null;
  duration_hours: number | null;
  long_day: boolean;
  recommended_stop_count: number;
  starting_price_pence: number | null;
  currency: string;
  direct_distance_miles: number | null;
  direct_duration_seconds: number | null;
  /** What the From price covers, from tour data only. */
  price_covers: TourPriceCovers;
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
  related: { slug: string; name: string }[];
  itinerary_md: string | null;
  included_md: string | null;
  excluded_md: string | null;
  suits_md: string | null;
  faq: { q: string; a: string }[];
  meta_description: string | null;
  updated_at: string | null;
  class_prices: { class_id: string; name: string; price_pence: number }[];
  reviews: { name: string; date: string; stars: number; text: string; source_url: string | null }[];
};

/**
 * THE tour "from" price. Home page, tours index and tour page all call this,
 * so one tour can never show two prices.
 */
export function tourStartingPricePence(row: any, rates: ClassRate[], fixed?: FixedTourPrices): number | null {
  const byClass = tourClassPricesPence(row, rates, fixed);
  if (byClass.length) return byClass[0].price_pence;
  const cached = row.starting_price_pence_cache;
  return cached != null ? Number(cached) : null;
}

function cleanFaq(v: unknown): { q: string; a: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x: any) => ({ q: String(x?.q ?? "").trim(), a: String(x?.a ?? "").trim() }))
    .filter((x) => x.q && x.a);
}

function pickCurrency(row: any): string {
  return (row.starting_price_currency as string | null) ?? "GBP";
}

// Per-class tour prices. A fixed price set for this tour and vehicle wins —
// that is exactly what the booking charges (buildQuote "Fixed tour price").
// Otherwise the class's hourly rate × the tour's day length is shown, which is
// what the booking charges when no fixed price exists.
type ClassRate = { id: string; name: string; hourly_rate: number | null; extra_hour_rate: number | null; min_hours: number | null };
/** template id → vehicle class id → fixed price in pounds. */
export type FixedTourPrices = Map<string, Map<string, number>>;
type TierRow = { hours: number; included_miles: number };
let classRateCache: { at: number; rates: ClassRate[]; tiers: TierRow[] } | null = null;
let tierRows: TierRow[] = [];
async function tourClassRates(): Promise<ClassRate[]> {
  if (classRateCache && Date.now() - classRateCache.at < 5 * 60_000) return classRateCache.rates;
  let rates: ClassRate[] = [];
  let tiers: TierRow[] = [];
  try {
    const { loadTourConfig } = await import("@/lib/tour-quote.server");
    const cfg = await loadTourConfig();
    tiers = cfg.tiers.map((t: any) => ({ hours: Number(t.hours), included_miles: Number(t.included_miles) }));
    rates = cfg.classes.map((c: any) => {
      const rate = c.hourly_rate == null ? null : Number(c.hourly_rate);
      const extra = c.extra_hour_rate == null ? null : Number(c.extra_hour_rate);
      return {
        id: c.id,
        name: c.name,
        hourly_rate: rate != null && Number.isFinite(rate) && rate > 0 ? rate : null,
        extra_hour_rate: extra != null && Number.isFinite(extra) && extra > 0 ? extra : null,
        min_hours: c.min_hours == null ? null : Number(c.min_hours),
      };
    });
  } catch (err) {
    console.error("tourClassRates failed", err);
  }
  classRateCache = { at: Date.now(), rates, tiers };
  tierRows = tiers;
  return rates;
}

async function fixedTourPrices(templateIds: string[]): Promise<FixedTourPrices> {
  const out: FixedTourPrices = new Map();
  if (!templateIds.length) return out;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("template_fixed_prices")
      .select("route_template_id, vehicle_class_id, price")
      .in("route_template_id", templateIds);
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      const price = Number(r.price);
      if (!r.route_template_id || !r.vehicle_class_id || !Number.isFinite(price) || price <= 0) continue;
      if (!out.has(r.route_template_id)) out.set(r.route_template_id, new Map());
      out.get(r.route_template_id)!.set(r.vehicle_class_id, price);
    }
  } catch (err) {
    console.error("fixedTourPrices failed", err);
  }
  return out;
}

function tourHours(row: any): number | null {
  const h = Number(row.duration_hours ?? row.default_duration_hours);
  return Number.isFinite(h) && h > 0 ? h : null;
}

/** Day price for each vehicle class: the tour's fixed price, else hourly rate × tour length (never below the class minimum). */
export function tourClassPricesPence(row: any, rates: ClassRate[], fixed?: FixedTourPrices): { class_id: string; name: string; price_pence: number }[] {
  const hours = tourHours(row);
  const fixedForTour = row?.id ? fixed?.get(row.id) : undefined;
  return rates
    .map((c) => {
      const f = fixedForTour?.get(c.id);
      if (f != null) return { class_id: c.id, name: c.name, price_pence: Math.round(f * 100) };
      if (hours == null || c.hourly_rate == null) return null;
      return { class_id: c.id, name: c.name, price_pence: Math.round(c.hourly_rate * Math.max(hours, c.min_hours ?? 0) * 100) };
    })
    .filter((c): c is { class_id: string; name: string; price_pence: number } => c != null)
    .sort((a, b) => a.price_pence - b.price_pence);
}

/** What the From price covers, for the same vehicle the From price comes from. */
export function tourCoversFor(row: any, rates: ClassRate[], fixed?: FixedTourPrices, tiers: TierRow[] = tierRows): TourPriceCovers {
  // Several vehicles can share the From price; describe one whose rates are set.
  const all = tourClassPricesPence(row, rates, fixed);
  const tied = all.filter((p) => p.price_pence === all[0]?.price_pence);
  const rated = tied.find((p) => {
    const c = rates.find((r) => r.id === p.class_id);
    return c && (c.extra_hour_rate != null || c.hourly_rate != null);
  });
  const from = rated ?? all[0];
  const cls = from ? rates.find((c) => c.id === from.class_id) ?? null : null;
  const hasFixed = !!(from && row?.id && fixed?.get(row.id)?.has(from.class_id));
  return tourPriceCovers({ row, fromClass: cls, hasFixedPrice: hasFixed, tiers });
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
    signature: !!row.signature,
    theme_group: row.theme_group ?? null,
    duration_hours: row.duration_hours != null ? Number(row.duration_hours) : row.default_duration_hours != null ? Number(row.default_duration_hours) : null,
    long_day: !!row.long_day,
    recommended_stop_count: recommendedStopCount,
    starting_price_pence: row.starting_price_pence_cache ?? null,
    currency: pickCurrency(row),
    direct_distance_miles: row.direct_distance_miles_cache ?? null,
    direct_duration_seconds: row.direct_duration_seconds_cache ?? null,
    price_covers: tourPriceCovers({ row, fromClass: null, hasFixedPrice: false, tiers: [] }),
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
  const [rates, fixed, cats] = await Promise.all([
    tourClassRates(),
    fixedTourPrices(ids),
    client.from("tour_categories").select("name, sort_order").order("sort_order"),
  ]);
  const catOrder = new Map<string, number>(((cats as any).data ?? []).map((c: any, i: number) => [c.name, i]));
  return rows.map((t: any) => {
    const item = toListItem(t, counts.get(t.id) ?? 0);
    item.category_order = t.theme_group ? catOrder.get(t.theme_group) ?? null : null;
    item.starting_price_pence = tourStartingPricePence(t, rates, fixed);
    item.price_covers = tourCoversFor(t, rates, fixed);
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
  return getTourDetailImpl(serverPublicClient(), { slug });
}

/**
 * Builds a tour page's data. Public pages pass the publishable client, so row
 * security only returns live tours; the staff draft preview passes the signed-in
 * admin's client and looks the tour up by id.
 */
export async function getTourDetailImpl(client: any, by: { slug: string } | { id: string }): Promise<PublicTourDetail | null> {
  let query = client.from("scenic_route_templates").select(DETAIL_FIELDS);
  query = "slug" in by ? query.eq("slug", by.slug) : query.eq("id", by.id);
  const { data: template, error } = await query.maybeSingle();
  if (error || !template) return null;

  const { data: joinRows } = await client
    .from("scenic_route_template_pois")
    .select(
      `stop_order, mandatory, default_selected, recommended, recommended_visit_minutes, points_of_interest!inner(${POI_FIELDS}, active)`,
    )
    .eq("route_template_id", (template as any).id)
    .order("stop_order", { ascending: true });

  const pois: PublicPoiCard[] = (joinRows ?? [])
    .filter((r: any) => r.points_of_interest?.active)
    .map((r: any) => {
      const poi = r.points_of_interest;
      const isMandatory = !!r.mandatory;
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
  // Same rule as the lists: cached price, else the hourly day rate. The cache
  // refresh runs in the background so this view never shows a different price.
  const [rates, fixed] = await Promise.all([tourClassRates(), fixedTourPrices([t.id])]);
  const classPrices = tourClassPricesPence(t, rates, fixed);
  if (cache.price_pence == null && !classPrices.length) void refreshStartingPriceCache(t.id).catch(() => null);
  cache.price_pence = tourStartingPricePence(t, rates, fixed);
  const priceCovers = tourCoversFor(t, rates, fixed);


  // Related slugs — up to 3 other published tours by display order.
  const { data: related } = await client
    .from("scenic_route_templates")
    .select("slug, name")
    .neq("id", t.id)
    .eq("active", true)
    .eq("published", true)
    .order("display_order", { ascending: true })
    .limit(3);

  const { data: reviewRows } = await client
    .from("tour_reviews")
    .select("reviewer_name, review_date, stars, body, source_url")
    .eq("template_id", t.id)
    .eq("published", true)
    .order("review_date", { ascending: false })
    .limit(20);

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
    signature: !!t.signature,
    theme_group: t.theme_group ?? null,
    duration_hours: t.duration_hours != null ? Number(t.duration_hours) : t.default_duration_hours != null ? Number(t.default_duration_hours) : null,
    long_day: !!t.long_day,
    recommended_stop_count: recommendedCount,
    starting_price_pence: cache.price_pence,
    currency: cache.currency,
    direct_distance_miles: cache.distance,
    direct_duration_seconds: cache.duration,
    price_covers: priceCovers,
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
    related: (related ?? []).map((r: any) => ({ slug: r.slug as string, name: r.name as string })),
    itinerary_md: t.itinerary_md ?? null,
    included_md: t.included_md ?? null,
    excluded_md: t.excluded_md ?? null,
    suits_md: t.suits_md ?? null,
    faq: cleanFaq(t.faq),
    meta_description: t.meta_description ?? null,
    updated_at: t.updated_at ?? null,
    class_prices: classPrices,
    reviews: (reviewRows ?? []).map((r: any) => ({
      name: r.reviewer_name, date: r.review_date, stars: Number(r.stars), text: r.body, source_url: r.source_url ?? null,
    })),
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
