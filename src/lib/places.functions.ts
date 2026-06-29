import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const acInput = z.object({
  input: z.string().trim().min(2).max(200),
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

// Place (New) primary types — see https://developers.google.com/maps/documentation/places/web-service/place-types
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
const ADDRESS_TYPES = ["street_address", "route", "premise", "subpremise", "airport", "train_station", "transit_station"];

function classify(types: string[] | undefined): "area" | "address" {
  if (!types) return "address";
  if (types.some((t) => AREA_TYPES.includes(t))) return "area";
  return "address";
}

/**
 * UK-only Places (New) autocomplete via the connector gateway.
 * Returns areas/localities and addresses; can be narrowed with `mode`.
 */
export const placesAutocomplete = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof acInput>) => acInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !lovableKey) return { suggestions: [] };

    const includedPrimaryTypes =
      data.mode === "areas" ? AREA_TYPES : data.mode === "addresses" ? ADDRESS_TYPES : undefined;

    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
        method: "POST",
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

      // When showing everything, surface areas above raw addresses
      if (data.mode === "all") {
        suggestions.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "area" ? -1 : 1));
      }
      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  });
