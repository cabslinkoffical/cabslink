import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { getGoogleMapsApiKey } from "@/lib/google-maps-env";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const acInput = z.object({
  input: z.string().trim().min(2).max(100),
  sessionToken: z.string().trim().max(200).optional(),
  mode: z.enum(["all", "areas", "addresses"]).optional(),
});

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  full: string;
  kind: "area" | "address";
};

const AREA_TYPES = [
  "locality",
  "sublocality",
  "postal_code",
  "postal_town",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "neighborhood",
];
const ADDRESS_TYPES = [
  "street_address",
  "route",
  "premise",
  "subpremise",
  "airport",
  "train_station",
  "transit_station",
];

function classify(types: string[] | undefined): "area" | "address" {
  if (!types) return "address";
  if (types.some((t) => AREA_TYPES.includes(t))) return "area";
  return "address";
}

/**
 * Lower rank = more precise. Customers type a street or building, so exact
 * addresses must appear above whole towns/cities in the dropdown.
 */
function precisionRank(types: string[] | undefined, secondary: string): number {
  const t = types ?? [];
  const has = (...names: string[]) => names.some((n) => t.includes(n));
  if (has("subpremise", "premise", "street_address")) return 0;
  if (has("airport", "train_station", "transit_station", "bus_station", "lodging")) return 1;
  if (has("route")) return 2;
  if (has("postal_code")) return 3;
  if (has("neighborhood", "sublocality")) return 5;
  if (has("locality", "postal_town")) return 6;
  if (has("administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3")) return 7;
  // Named places (businesses, landmarks) with a street line are precise enough.
  return secondary ? 2 : 4;
}

// Short-lived cache for identical normalized queries (per Worker isolate).
type CacheEntry = { value: { suggestions: PlaceSuggestion[]; ok: boolean }; expiresAt: number };
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(d: z.infer<typeof acInput>) {
  return `${d.mode ?? "all"}|${d.input.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

export const placesAutocomplete = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => acInput.parse(data))
  .handler(async ({ data }) => {
    // Per-IP sliding-window rate limit: 60 queries / minute.
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "placesAutocomplete", windowMs: 60_000, max: 60 }, ip).ok) {
      console.error(`[places] rate limited ip=${ip}`);
      try { setResponseStatus(429); } catch {}
      return { suggestions: [] as PlaceSuggestion[], ok: false };
    }

    const key = cacheKey(data);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    const apiKey = getGoogleMapsApiKey();
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) {
      console.error(`[places] missing LOVABLE_API_KEY`);
      return { suggestions: [], ok: false };
    }

    const includedPrimaryTypes =
      data.mode === "areas" ? AREA_TYPES : data.mode === "addresses" ? ADDRESS_TYPES : undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: data.input,
          includedRegionCodes: ["gb"],
          languageCode: "en-GB",
          regionCode: "GB",
          ...(includedPrimaryTypes ? { includedPrimaryTypes } : {}),
          ...(data.sessionToken ? { sessionToken: data.sessionToken } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`Places autocomplete failed [${res.status}]: ${body.slice(0, 500)}`);
        if (res.status === 403 && /API_KEY_HTTP_REFERRER_BLOCKED/.test(body)) {
          console.error(
            "Google Maps server key is referrer-restricted. Set the server key's application restrictions to \"None\" or \"IP addresses\" in Google Cloud Console.",
          );
        }
        return { suggestions: [], ok: false };
      }
      const json = (await res.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId: string;
            types?: string[];
            text?: { text: string };
            structuredFormat?: {
              mainText?: { text: string };
              secondaryText?: { text: string };
            };
          };
        }>;
      };
      const ranked = (json.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p, i) => {
          const primary = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
          const secondary = p.structuredFormat?.secondaryText?.text ?? "";
          return {
            order: i,
            rank: precisionRank(p.types, secondary),
            place: {
              placeId: p.placeId,
              primary,
              secondary,
              full: p.text?.text ?? "",
              kind: classify(p.types),
            } as PlaceSuggestion,
          };
        });
      if (data.mode === "areas") {
        ranked.sort((a, b) => b.rank - a.rank || a.order - b.order);
      } else {
        // Street-level and building results first; towns/regions last.
        ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);
      }
      const suggestions: PlaceSuggestion[] = ranked.map((r) => r.place);
      const value = { suggestions, ok: true };
      cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
      return value;
    } catch (e: any) {
      console.error(`[places] fetch threw: ${e?.name} ${e?.message}`);
      return { suggestions: [], ok: false };
    } finally {
      clearTimeout(timer);
    }
  });

const resolveInput = z.object({ input: z.string().trim().min(3).max(120) });

/**
 * Resilience path: turn a free-typed address into a real Place ID when the
 * autocomplete list is unavailable (API hiccup, timeout, rate limit). Pricing
 * needs a Place ID, so a text search keeps the booking flow usable instead of
 * leaving the customer with a field they can never satisfy.
 */
export const resolvePlaceText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => resolveInput.parse(data))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "resolvePlaceText", windowMs: 60_000, max: 30 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      return { place: null as PlaceSuggestion | null };
    }

    const apiKey = getGoogleMapsApiKey();
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return { place: null as PlaceSuggestion | null };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apiKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types",
        },
        body: JSON.stringify({
          textQuery: data.input,
          languageCode: "en-GB",
          regionCode: "GB",
          includedRegionCodes: ["gb"],
          maxResultCount: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`Places searchText failed [${res.status}]: ${body.slice(0, 500)}`);
        return { place: null as PlaceSuggestion | null };
      }
      const json = (await res.json()) as {
        places?: Array<{
          id: string;
          types?: string[];
          displayName?: { text?: string };
          formattedAddress?: string;
        }>;
      };
      const first = json.places?.[0];
      if (!first?.id) return { place: null as PlaceSuggestion | null };
      const primary = first.displayName?.text ?? first.formattedAddress ?? data.input;
      const full = first.formattedAddress ?? primary;
      return {
        place: {
          placeId: first.id,
          primary,
          secondary: first.formattedAddress && first.formattedAddress !== primary ? first.formattedAddress : "",
          full,
          kind: classify(first.types),
        } as PlaceSuggestion,
      };
    } catch (e: any) {
      console.error(`[places] searchText threw: ${e?.name} ${e?.message}`);
      return { place: null as PlaceSuggestion | null };
    } finally {
      clearTimeout(timer);
    }
  });
