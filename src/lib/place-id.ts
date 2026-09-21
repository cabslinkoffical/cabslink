import { z } from "zod";

/**
 * Google Place IDs are opaque ASCII strings. We accept a conservative set of
 * URL-safe characters so we can reject bad input immediately without depending
 * on the exact upstream format.
 */
export const placeIdSchema = z
  .string()
  .trim()
  .min(1, "Select a location from the list, or use the address you typed.")
  .max(300, "Invalid location identifier.")
  .refine((v) => !/[\s\x00-\x1f\x7f]/.test(v), "Invalid location identifier.")
  .refine((v) => /^[A-Za-z0-9_\-:.=@]+$/.test(v), "Invalid location identifier.");

export const placeLabelSchema = z.string().trim().min(1).max(500);

export const selectedPlaceSchema = z.object({
  placeId: placeIdSchema,
  label: placeLabelSchema,
});

export type SelectedPlaceInput = z.infer<typeof selectedPlaceSchema>;
