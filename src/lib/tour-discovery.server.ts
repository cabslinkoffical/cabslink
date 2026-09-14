/**
 * Live place discovery for the hourly/tour builder.
 *
 * Curated points of interest are the first-class suggestions, but customers
 * starting from a town we have not hand-curated need something to choose from.
 * This asks Google Places (New) for visitor attractions inside the driving
 * radius that the chosen hours pay for, so the suggestions are always tied to
 * the mileage allowance rather than a fixed list.
 *
 * Server-only: the gateway credentials never reach the browser.
 */
import { getGoogleMapsApiKey } from "@/lib/google-maps-env";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

/** Places caps a nearby search radius at 50 km. */
const MAX_RADIUS_METRES = 50_000;
const METRES_PER_MILE = 1609.34;

/** Visitor-facing categories worth offering as a tour stop. */
const INCLUDED_TYPES = [
  "tourist_attraction",
  "historical_landmark",
  "museum",
  "national_park",
  "park",
  "hiking_area",
  "art_gallery",
  "zoo",
  "aquarium",
  "garden",
];

export type DiscoveredPlace = {
  placeId: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number;
};

const cache = new Map<string, { at: number; places: DiscoveredPlace[] }>();
const CACHE_MS = 30 * 60 * 1000;

function prettyType(type?: string | null): string | null {
  if (!type) return null;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Attractions around a centre point, ordered by review popularity.
 * Returns an empty list on any failure — discovery is a bonus, never a blocker.
 */
export async function discoverNearbyPlaces(args: {
  centre: { lat: number; lng: number };
  radiusMiles: number;
  limit?: number;
}): Promise<DiscoveredPlace[]> {
  const radius = Math.min(
    MAX_RADIUS_METRES,
    Math.max(2_000, Math.round(args.radiusMiles * METRES_PER_MILE)),
  );
  const key = `${args.centre.lat.toFixed(3)},${args.centre.lng.toFixed(3)}:${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places.slice(0, args.limit ?? 20);

  const apiKey = getGoogleMapsApiKey();
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !lovableKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.primaryType,places.location,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        includedTypes: INCLUDED_TYPES,
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        languageCode: "en-GB",
        regionCode: "GB",
        locationRestriction: {
          circle: { center: { latitude: args.centre.lat, longitude: args.centre.lng }, radius },
        },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Nearby place discovery failed [${res.status}]: ${body.slice(0, 300)}`);
      return [];
    }
    const json = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        primaryType?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
      }>;
    };
    const places: DiscoveredPlace[] = (json.places ?? [])
      .filter(
        (p) =>
          p.id &&
          p.displayName?.text &&
          typeof p.location?.latitude === "number" &&
          typeof p.location?.longitude === "number",
      )
      .map((p) => ({
        placeId: p.id!,
        name: p.displayName!.text!,
        category: prettyType(p.primaryType),
        lat: p.location!.latitude!,
        lng: p.location!.longitude!,
        rating: typeof p.rating === "number" ? p.rating : null,
        reviewCount: Number(p.userRatingCount ?? 0),
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount);

    cache.set(key, { at: Date.now(), places });
    return places.slice(0, args.limit ?? 20);
  } catch (err) {
    clearTimeout(timer);
    console.error("Nearby place discovery error", err);
    return [];
  }
}
