/**
 * Per-vehicle-class fares for published `/routes/*` pages.
 *
 * The figures come from the same engine that quotes a live booking
 * (`src/lib/pricing.ts` via `computeVehicleQuote`), driven by the route's
 * stored driving distance in `seo_popular_routes`. Nothing here is
 * hardcoded: if the route has no genuine cached distance, or no active
 * pricing profile can produce a fare, the function returns `null` and the
 * page renders no table at all rather than a placeholder.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  computeVehicleQuote,
  loadActiveProfiles,
  loadQuoteSettings,
  publicClient,
} from "@/lib/pricing-helpers.server";

export type RouteFare = {
  classSlug: string;
  className: string;
  passengers: number;
  luggage: number;
  price: number;
};

export type RouteFareTable = {
  slug: string;
  distanceMiles: number;
  durationMinutes: number | null;
  currency: string;
  currencySymbol: string;
  taxLabel: string;
  taxIncluded: boolean;
  fares: RouteFare[];
};

export const getRouteFares = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(160) }).parse(i),
  )
  .handler(async ({ data }): Promise<RouteFareTable | null> => {
    const client = publicClient();

    const { data: route } = await client
      .from("seo_popular_routes")
      .select("slug, direct_distance_miles_cache, direct_duration_seconds_cache")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const distanceMiles = Number((route as any)?.direct_distance_miles_cache);
    // No genuine distance → no fare table on this route. Never guess.
    if (!route || !Number.isFinite(distanceMiles) || distanceMiles <= 0) return null;

    const durationSeconds = Number((route as any).direct_duration_seconds_cache);
    const durationMinutes = Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.round(durationSeconds / 60)
      : null;

    let settings: Awaited<ReturnType<typeof loadQuoteSettings>>;
    let profiles: Awaited<ReturnType<typeof loadActiveProfiles>>;
    try {
      [settings, profiles] = await Promise.all([
        loadQuoteSettings(client),
        loadActiveProfiles(client),
      ]);
    } catch {
      return null;
    }

    const fares: RouteFare[] = profiles
      // Quote-on-request classes have no publishable figure.
      .filter((p) => !p.vehicle.class_quote_on_request)
      .map((p) => {
        const q = computeVehicleQuote({
          profile: p,
          distanceMiles,
          viaStops: 0,
          areaSurcharges: [],
          fixedPrice: null,
          settings,
          vehicleCount: 1,
        });
        return {
          classSlug: p.vehicle.class_slug,
          className: p.vehicle.class_name,
          passengers: Number(p.vehicle.passengers) || 0,
          luggage: Number(p.vehicle.luggage) || 0,
          price: Math.round(Number(q.finalTotal) * 100) / 100,
          order: Number(p.vehicle.class_display_order) || 0,
        };
      })
      .filter((f) => Number.isFinite(f.price) && f.price > 0)
      .sort((a, b) => a.order - b.order || a.price - b.price)
      .map(({ order: _order, ...f }) => f);

    if (!fares.length) return null;

    return {
      slug: data.slug,
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      durationMinutes,
      currency: settings.currency || "GBP",
      currencySymbol: settings.currencySymbol || "£",
      taxLabel: settings.taxLabel,
      taxIncluded: settings.taxEnabled,
      fares,
    };
  });
