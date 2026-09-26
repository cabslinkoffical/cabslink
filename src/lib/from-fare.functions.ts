import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * "From £X" fare for a location page: cheapest active vehicle, priced by the
 * live pricing engine (base + mileage bands + tax) for the estimated road
 * distance from Edinburgh city centre. No fixed-route or time surcharges —
 * it is a starting price, the booking quote is authoritative.
 */
const EDINBURGH = { lat: 55.9533, lng: -3.1883 };

let cache: { at: number; data: unknown } | null = null;

export const getFromFare = createServerFn({ method: "GET" })
  .inputValidator((d: { lat: number; lng: number }) =>
    z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ amount: number; symbol: string; vehicle: string; miles: number } | null> => {
    const h = await import("@/lib/pricing-helpers.server");
    const { haversineMiles } = await import("@/lib/pricing-rules");
    try {
      if (!cache || Date.now() - cache.at > 10 * 60_000) {
        const client = h.publicClient();
        const [profiles, settings] = await Promise.all([h.loadActiveProfiles(client), h.loadQuoteSettings(client)]);
        cache = { at: Date.now(), data: { profiles, settings } };
      }
      const { profiles, settings } = cache.data as {
        profiles: Awaited<ReturnType<typeof h.loadActiveProfiles>>;
        settings: Awaited<ReturnType<typeof h.loadQuoteSettings>>;
      };
      if (!profiles.length) return null;
      const miles = Math.max(1, Math.round(haversineMiles(EDINBURGH, data) * 1.3));
      let best: { amount: number; vehicle: string } | null = null;
      for (const p of profiles) {
        const q = h.computeVehicleQuote({
          profile: p, distanceMiles: miles, viaStops: 0, areaSurcharges: [],
          fixedPrice: null, settings, serviceType: "direct_transfer",
        });
        if (q.perVehicleTotal > 0 && (!best || q.perVehicleTotal < best.amount)) {
          best = { amount: q.perVehicleTotal, vehicle: p.vehicle.name };
        }
      }
      return best ? { amount: Math.round(best.amount), symbol: settings.currencySymbol || "£", vehicle: best.vehicle, miles } : null;
    } catch {
      return null;
    }
  });
