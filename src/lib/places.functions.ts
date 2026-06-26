import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const acInput = z.object({
  input: z.string().trim().min(2).max(200),
  sessionToken: z.string().trim().max(200).optional(),
});

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  full: string;
};

/**
 * UK-only Places (New) autocomplete via the connector gateway.
 */
export const placesAutocomplete = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof acInput>) => acInput.parse(data))
  .handler(async ({ data }): Promise<{ suggestions: PlaceSuggestion[] }> => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !lovableKey) return { suggestions: [] };

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
          ...(data.sessionToken ? { sessionToken: data.sessionToken } : {}),
        }),
      });
      if (!res.ok) return { suggestions: [] };
      const json = (await res.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId: string;
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
        }));
      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  });
