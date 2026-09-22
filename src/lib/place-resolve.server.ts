/**
 * Server-only text → Google Place ID resolver used by the bulk importer.
 *
 * Spreadsheets carry human addresses ("Edinburgh Airport"), never Place IDs, so
 * the importer looks each one up once through the Places gateway and fills the
 * id / label / lat / lng columns itself. Results are memoised per Worker isolate
 * so a file that repeats the same airport 200 times costs one lookup.
 */
import { getGoogleMapsApiKey } from "@/lib/google-maps-env";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type ResolvedPlace = { placeId: string; label: string; lat: number | null; lng: number | null };
export type PlaceRequest = { text: string; lat?: number | null; lng?: number | null };

const cache = new Map<string, ResolvedPlace | null>();

function norm(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function gatewayHeaders(lovableKey: string, apiKey: string, fieldMask: string) {
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": apiKey,
    "Content-Type": "application/json",
    "X-Goog-FieldMask": fieldMask,
  };
}

/**
 * Reverse geocode a coordinate pair into a Place ID when the sheet supplies
 * coordinates but no usable address text.
 */
async function reverseLookup(lat: number, lng: number): Promise<ResolvedPlace | null> {
  const apiKey = getGoogleMapsApiKey();
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) return null;
  try {
    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?latlng=${lat},${lng}&region=gb&language=en-GB`,
      { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey } },
    );
    if (!res.ok) {
      console.error(`[bulk-import] reverse geocode failed [${res.status}]`);
      return null;
    }
    const json = (await res.json()) as {
      results?: Array<{ place_id?: string; formatted_address?: string }>;
    };
    const first = json.results?.[0];
    if (!first?.place_id) return null;
    return { placeId: first.place_id, label: first.formatted_address ?? `${lat},${lng}`, lat, lng };
  } catch (e) {
    console.error(`[bulk-import] reverse geocode threw: ${(e as Error).message}`);
    return null;
  }
}

async function lookup(text: string, bias?: { lat: number; lng: number }): Promise<ResolvedPlace | null> {
  const apiKey = getGoogleMapsApiKey();
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) return null;


  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      signal: controller.signal,
      headers: gatewayHeaders(
        lovableKey,
        apiKey,
        "places.id,places.displayName,places.formattedAddress,places.location",
      ),
      body: JSON.stringify({
        textQuery: text,
        languageCode: "en-GB",
        regionCode: "GB",
        maxResultCount: 1,
        // Coordinates supplied in the sheet pin the search to that exact spot,
        // so same-named villages cannot resolve to the wrong place.
        ...(bias
          ? { locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 5000 } } }
          : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[bulk-import] place lookup failed [${res.status}]: ${body.slice(0, 300)}`);
      return null;
    }
    const json = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      }>;
    };
    const first = json.places?.[0];
    if (!first?.id) return null;
    return {
      placeId: first.id,
      label: first.formattedAddress ?? first.displayName?.text ?? text,
      lat: typeof first.location?.latitude === "number" ? first.location.latitude : null,
      lng: typeof first.location?.longitude === "number" ? first.location.longitude : null,
    };
  } catch (e) {
    console.error(`[bulk-import] place lookup threw: ${(e as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve many address strings, in small parallel batches, with a hard cap so a
 * huge file cannot run away with Maps usage.
 */
export async function resolvePlaceTexts(
  texts: string[],
  maxLookups = 300,
): Promise<{ map: Map<string, ResolvedPlace>; lookups: number; capped: boolean }> {
  const map = new Map<string, ResolvedPlace>();
  const pending: string[] = [];
  for (const raw of texts) {
    const key = norm(raw);
    if (!key) continue;
    if (cache.has(key)) {
      const hit = cache.get(key);
      if (hit) map.set(key, hit);
      continue;
    }
    if (!pending.includes(key)) pending.push(key);
  }

  const capped = pending.length > maxLookups;
  const todo = pending.slice(0, maxLookups);
  let lookups = 0;
  const CONCURRENCY = 4;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((t) => lookup(t)));
    batch.forEach((t, j) => {
      const r = results[j] ?? null;
      lookups += 1;
      // Cache successful matches only. A temporary Maps error must not poison
      // later validation attempts in the same running server.
      if (r) {
        cache.set(t, r);
        map.set(t, r);
      }
    });
  }

  return { map, lookups, capped };
}

export function placeTextKey(text: string) {
  return norm(text);
}
