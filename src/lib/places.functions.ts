import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";

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

// Short-lived cache for identical normalized queries (per Worker isolate).
type CacheEntry = { value: { suggestions: PlaceSuggestion[] }; expiresAt: number };
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(d: z.infer<typeof acInput>) {
  return `${d.mode ?? "all"}|${d.input.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

export const placesAutocomplete = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof acInput>) => acInput.parse(data))
  .handler(async ({ data }) => {
    // Per-IP sliding-window rate limit: 60 queries / minute.
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "placesAutocomplete", windowMs: 60_000, max: 60 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      return { suggestions: [] as PlaceSuggestion[] };
    }

    const key = cacheKey(data);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !lovableKey) return { suggestions: [] };

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
      if (!res.ok) return { suggestions: [] };
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
      const suggestions: PlaceSuggestion[] = (json.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({
          placeId: p.placeId,
          primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
          secondary: p.structuredFormat?.secondaryText?.text ?? "",
          full: p.text?.text ?? "",
          kind: classify(p.types),
        }));
      if (data.mode === "all") {
        suggestions.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "area" ? -1 : 1));
      }
      const value = { suggestions };
      cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
      return value;
    } catch {
      return { suggestions: [] };
    } finally {
      clearTimeout(timer);
    }
  });
