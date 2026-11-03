/**
 * Browser-safe rules for the step-by-step tour editor: the save payload and
 * the checklist a tour must pass before it can be published. The checklist
 * mirrors publishScenicTemplate and the database publish guard.
 */
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";

export const TOUR_STEPS = [
  { key: "basics", label: "Basics" },
  { key: "route", label: "Start & finish" },
  { key: "stops", label: "Stops" },
  { key: "pricing", label: "Length & price" },
  { key: "review", label: "Check & preview" },
] as const;

export const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const hours = z.coerce.number().min(1).max(24).nullable().optional();

export const tourDraftSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  tour: z.object({
    name: z.string().trim().min(3, "Give the tour a name.").max(200).optional(),
    slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens").optional(),
    theme: text(80),
    theme_group: text(60),
    short_description: text(500),
    description: text(4000),
    hero_image_url: text(500),
    recommended_start_time: text(40),
    origin_place_id: placeIdSchema.nullable().optional(),
    origin_label: text(240),
    destination_place_id: placeIdSchema.nullable().optional(),
    destination_label: text(240),
    start_mode: z.enum(["customer", "fixed"]).optional(),
    default_duration_hours: hours,
    min_duration_hours: hours,
    max_duration_hours: hours,
    included_miles: z.coerce.number().min(0).max(2000).nullable().optional(),
    is_bookable: z.boolean().optional(),
    price_mode: z.enum(["manual", "auto"]).optional(),
  }).strict(),
  stops: z.array(z.object({
    poi_id: z.string().uuid(),
    mandatory: z.boolean().default(false),
    default_selected: z.boolean().default(true),
    recommended_visit_minutes: z.coerce.number().int().min(0).max(600).nullable().optional(),
  })).max(30).nullable().optional(),
  prices: z.array(z.object({ vehicle_class_id: z.string().uuid(), price: z.coerce.number().min(0).max(100000) })).max(60).nullable().optional(),
}).refine((d) => !!d.id || (!!d.tour.name && !!d.tour.slug), { message: "A new tour needs a name and a web address.", path: ["tour", "name"] })
  .refine((d) => {
    const t = d.tour;
    const min = t.min_duration_hours ?? null, max = t.max_duration_hours ?? null, def = t.default_duration_hours ?? null;
    return (min == null || max == null || min <= max) && (def == null || ((min == null || def >= min) && (max == null || def <= max)));
  }, { message: "The usual length must sit between the shortest and longest lengths.", path: ["tour", "default_duration_hours"] });

export type TourDraftInput = z.input<typeof tourDraftSchema>;

export type PublishCheck = { label: string; ok: boolean; required: boolean };

/**
 * What must be true before a tour can go live (required), plus advice. The
 * required items match the publish guard: name and address, start and finish,
 * and every stop switched on with a map location.
 */
export function publishChecklist(t: {
  name?: string | null; slug?: string | null; origin_place_id?: string | null; destination_place_id?: string | null;
  default_duration_hours?: number | null;
  stops: Array<{ active: boolean; hasPlace: boolean }>;
  pricedVehicles: number;
  hasImage: boolean;
}): PublishCheck[] {
  const readyStops = t.stops.filter((s) => s.active && s.hasPlace).length;
  return [
    { label: "Name and web address", ok: !!t.name?.trim() && !!t.slug?.trim(), required: true },
    { label: "Start point chosen", ok: !!t.origin_place_id, required: true },
    { label: "Finish point chosen", ok: !!t.destination_place_id, required: true },
    { label: "At least one stop", ok: t.stops.length > 0, required: true },
    { label: "Every stop is switched on and on the map", ok: t.stops.length > 0 && readyStops === t.stops.length, required: true },
    { label: "Usual tour length set", ok: Number(t.default_duration_hours ?? 0) > 0, required: false },
    { label: "Tour price set for at least one vehicle (otherwise hourly rates are used)", ok: t.pricedVehicles > 0, required: false },
    { label: "Main photo added", ok: t.hasImage, required: false },
  ];
}

export const readyToPublish = (checks: PublishCheck[]) => checks.every((c) => !c.required || c.ok);
