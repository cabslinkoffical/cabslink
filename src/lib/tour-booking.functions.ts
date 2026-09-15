/**
 * Public server functions for the day-tour booking flow.
 *
 * The browser never sets a price. It asks for a quote, and when the customer
 * pays, the price stored on the booking is the one this file computed.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";
import { checkLimit } from "@/lib/rate-limit.server";
import { assertCaptcha } from "@/lib/captcha.server";
import { TOUR_SERVICE_TYPE } from "@/lib/tour-enquiries";
import {
  loadTourConfig,
  quoteTourImpl,
  capacityLeft,
  type TourQuoteResult,
} from "@/lib/tour-quote.server";
import type { HourTier, TourRules } from "@/lib/tour-quote";

export type TourBookingOptions = {
  tiers: HourTier[];
  rules: TourRules;
  classes: Array<{
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    max_passengers: number | null;
    max_luggage: number | null;
    min_hours: number | null;
    max_hours: number | null;
    hourly_rate: number | null;
  }>;
  tours: Array<{
    id: string;
    slug: string;
    name: string;
    hero_image_url: string | null;
    short_description: string | null;
    default_duration_hours: number | null;
    min_duration_hours: number | null;
    max_duration_hours: number | null;
    included_miles: number | null;
    start_mode: string;
    fixed_start_address: string | null;
    origin_label: string | null;
    prices: Array<{ vehicle_class_id: string; price: number }>;
    stops: Array<{
      poi_id: string;
      name: string;
      place_id: string;
      image_url: string | null;
      recommended_visit_minutes: number;
      mandatory: boolean;
      default_selected: boolean;
      stop_order: number;
    }>;
  }>;
};

/** Everything the wizard needs to render, in one call. */
export const getTourBookingOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<TourBookingOptions> => {
    const config = await loadTourConfig();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [classRows, tplRows, priceRows] = await Promise.all([
      supabaseAdmin
        .from("vehicle_classes")
        .select("id, name, slug, hero_image, display_order, active")
        .order("display_order"),
      supabaseAdmin
        .from("scenic_route_templates")
        .select(
          "id, slug, name, hero_image_url, short_description, default_duration_hours, min_duration_hours, max_duration_hours, included_miles, start_mode, fixed_start_address, origin_label, display_order, is_bookable, active, published",
        )
        .order("display_order"),
      supabaseAdmin.from("template_fixed_prices").select("route_template_id, vehicle_class_id, price"),
    ]);

    const templates = ((tplRows.data ?? []) as any[]).filter((t) => t.active !== false && t.published !== false);
    const ids = templates.map((t) => t.id);

    let stopRows: any[] = [];
    if (ids.length) {
      const res: any = await supabaseAdmin
        .from("scenic_route_template_pois")
        .select(
          "route_template_id, poi_id, stop_order, mandatory, default_selected, points_of_interest(id, name, place_id, image_url, recommended_visit_minutes, minimum_visit_minutes)",
        )
        .in("route_template_id", ids)
        .order("stop_order");
      stopRows = (res.data ?? []) as any[];
    }

    const classMeta = new Map<string, any>(((classRows.data ?? []) as any[]).map((c) => [c.id, c]));

    return {
      tiers: config.tiers.filter((t) => t.is_bookable),
      rules: config.rules,
      classes: config.classes.map((c) => {
        const meta = classMeta.get(c.id);
        return {
          id: c.id,
          name: c.name,
          slug: meta?.slug ?? null,
          image_url: meta?.hero_image ?? null,
          max_passengers: c.max_passengers,
          max_luggage: c.max_luggage,
          min_hours: c.min_hours,
          max_hours: c.max_hours,
          hourly_rate: c.hourly_rate,
        };
      }),
      tours: templates.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        hero_image_url: t.hero_image_url ?? null,
        short_description: t.short_description ?? null,
        default_duration_hours: t.default_duration_hours == null ? null : Number(t.default_duration_hours),
        min_duration_hours: t.min_duration_hours == null ? null : Number(t.min_duration_hours),
        max_duration_hours: t.max_duration_hours == null ? null : Number(t.max_duration_hours),
        included_miles: t.included_miles == null ? null : Number(t.included_miles),
        start_mode: t.start_mode ?? "customer",
        fixed_start_address: t.fixed_start_address ?? null,
        origin_label: t.origin_label ?? null,
        prices: ((priceRows.data ?? []) as any[])
          .filter((p) => p.route_template_id === t.id)
          .map((p) => ({ vehicle_class_id: p.vehicle_class_id, price: Number(p.price) })),
        stops: stopRows
          .filter((s) => s.route_template_id === t.id && s.points_of_interest)
          .map((s) => ({
            poi_id: s.poi_id,
            name: s.points_of_interest.name,
            place_id: s.points_of_interest.place_id,
            image_url: s.points_of_interest.image_url ?? null,
            recommended_visit_minutes: Number(
              s.points_of_interest.recommended_visit_minutes ??
                s.points_of_interest.minimum_visit_minutes ??
                config.rules.minimum_stop_minutes,
            ),
            mandatory: !!s.mandatory,
            default_selected: s.default_selected !== false,
            stop_order: Number(s.stop_order ?? 0),
          })),
      })),
    };
  },
);

const stopSchema = z.object({
  poiId: z.string().uuid().nullable().optional(),
  placeId: placeIdSchema,
  name: z.string().trim().min(1).max(160),
  dwellMinutes: z.coerce.number().min(0).max(600).nullable().optional(),
});

const quoteSchema = z.object({
  mode: z.enum(["premade", "custom"]),
  templateId: z.string().uuid().nullable().optional(),
  startPlaceId: placeIdSchema,
  startLabel: z.string().trim().min(1).max(240),
  endPlaceId: placeIdSchema.nullable().optional(),
  endLabel: z.string().trim().max(240).nullable().optional(),
  hours: z.coerce.number().min(1).max(24),
  vehicleClassId: z.string().uuid(),
  passengers: z.coerce.number().int().min(1).max(80),
  luggage: z.coerce.number().int().min(0).max(80),
  stops: z.array(stopSchema).max(15).default([]),
});

export type TourQuoteRequest = z.input<typeof quoteSchema>;

export const quoteTour = createServerFn({ method: "POST" })
  .inputValidator((d: TourQuoteRequest) => quoteSchema.parse(d))
  .handler(async ({ data }): Promise<TourQuoteResult> => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { /* no request ip */ }
    if (!checkLimit({ name: "tour-quote", windowMs: 60_000, max: 40 }, ip).ok) {
      try { setResponseStatus(429); } catch { /* headers sent */ }
      throw new Error("Too many price checks. Please wait a moment and try again.");
    }
    return quoteTourImpl(data);
  });

/** Stops reachable inside the mileage that comes with the chosen hours. */
export const getTourStopSuggestions = createServerFn({ method: "POST" })
  .inputValidator((d: { startPlaceId: string; hours: number; limit?: number }) =>
    z
      .object({
        startPlaceId: placeIdSchema,
        hours: z.coerce.number().min(1).max(24),
        limit: z.coerce.number().int().min(1).max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { includedMilesFor } = await import("@/lib/tour-quote");
    const { tourPoiSuggestionsImpl } = await import("@/lib/tour-quote.server");
    const config = await loadTourConfig();
    return tourPoiSuggestionsImpl({
      startPlaceId: data.startPlaceId,
      includedMiles: includedMilesFor(data.hours, config.tiers),
      limit: data.limit ?? 24,
      radiusFactor: config.rules.poi_radius_factor,
    });
  });

const bookSchema = quoteSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a tour date."),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Choose a start time."),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  flight: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1500).nullable().optional(),
  website: z.string().trim().max(500).optional().default(""),
  captchaToken: z.string().trim().max(4096).optional().nullable(),
});

export type TourBookingRequest = z.input<typeof bookSchema>;
export type TourBookingCreated = {
  bookingRef: string;
  total: number;
  holdMinutes: number;
};

/**
 * Saves the tour with `price = NULL` and `status = pending_payment`, storing the
 * server-side total for checkout. Nothing is charged here.
 */
export const createTourBooking = createServerFn({ method: "POST" })
  .inputValidator((d: TourBookingRequest) => bookSchema.parse(d))
  .handler(async ({ data }): Promise<TourBookingCreated> => {
    if (data.website && data.website.trim() !== "") {
      return { bookingRef: "", total: 0, holdMinutes: 0 };
    }

    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { /* no request ip */ }
    if (!checkLimit({ name: "tour-booking", windowMs: 10 * 60_000, max: 6 }, ip).ok) {
      try { setResponseStatus(429); } catch { /* headers sent */ }
      throw new Error("You've started several tour bookings already. Please try again shortly.");
    }
    await assertCaptcha(data.captchaToken, ip, setResponseStatus);

    const config = await loadTourConfig();

    // Notice period and start-time window.
    const start = new Date(`${data.date}T${data.time.padStart(5, "0")}:00`);
    const noticeMs = config.rules.minimum_notice_hours * 3_600_000;
    if (!Number.isNaN(start.getTime()) && start.getTime() - Date.now() < noticeMs) {
      throw new Error(
        `Tours need at least ${config.rules.minimum_notice_hours} hours' notice. Please call us for anything sooner.`,
      );
    }
    // Same-day booking window, both set by staff.
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (data.date === todayISO) {
      if (!config.rules.allow_same_day) {
        throw new Error("Same-day tours can't be booked online. Please call us and we'll do our best to help.");
      }
      const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (clock > config.rules.same_day_cutoff_time) {
        throw new Error(
          `Same-day tours can only be booked until ${config.rules.same_day_cutoff_time}. Please choose another date or call us.`,
        );
      }
    }
    if (data.time < config.rules.earliest_start_time) {
      throw new Error(`Tours start from ${config.rules.earliest_start_time} onwards.`);
    }
    // A tour has to finish the same day, inside the bookable window.
    const [sh, sm] = data.time.split(":").map((v) => Number(v));
    const [lh, lm] = config.rules.latest_finish_time.split(":").map((v) => Number(v));
    const startMins = (sh ?? 0) * 60 + (sm ?? 0);
    const latestMins = (lh ?? 22) * 60 + (lm ?? 0);
    if (startMins + data.hours * 60 > latestMins) {
      const latestStart = latestMins - data.hours * 60;
      throw new Error(
        latestStart >= 0
          ? `A ${data.hours}-hour tour has to start by ${String(Math.floor(latestStart / 60)).padStart(2, "0")}:${String(latestStart % 60).padStart(2, "0")} so it finishes by ${config.rules.latest_finish_time}. Please choose an earlier start or fewer hours.`
          : `A ${data.hours}-hour tour runs past ${config.rules.latest_finish_time}. Please call us and we'll arrange a multi-day tour.`,
      );
    }
    if (data.hours > config.rules.max_bookable_hours) {
      throw new Error(
        `We book tours online up to ${config.rules.max_bookable_hours} hours. For anything longer please contact us and we'll confirm the cost with you.`,
      );
    }


    const left = await capacityLeft(data.vehicleClassId, data.date);
    if (left !== null && left <= 0) {
      throw new Error("That vehicle is fully booked on your date. Please pick another vehicle or date.");
    }

    const result = await quoteTourImpl(data);
    if (result.quote.blockedReason) throw new Error(result.quote.blockedReason);
    if (result.quote.total < 1) throw new Error("We couldn't price this tour. Please call us and we'll help.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const refRpc: any = await supabaseAdmin.rpc("generate_booking_ref");
    if (refRpc.error || !refRpc.data) {
      console.error("generate_booking_ref failed", refRpc.error);
      throw new Error("Couldn't save your tour. Please try again.");
    }
    const bookingRef = String(refRpc.data);
    const holdMinutes = config.rules.checkout_hold_minutes;

    const stopNames = data.stops.map((s) => s.name);
    let tourName: string | null = "Custom day tour";
    let tourSlug: string | null = null;
    if (data.mode === "premade" && data.templateId) {
      const tpl: any = await supabaseAdmin
        .from("scenic_route_templates")
        .select("name, slug")
        .eq("id", data.templateId)
        .maybeSingle();
      tourName = tpl.data?.name ?? "Day tour";
      tourSlug = tpl.data?.slug ?? null;
    }

    const insert: any = {
      booking_ref: bookingRef,
      customer_name: data.name,
      email: data.email,
      phone: data.phone,
      pickup_address: data.startLabel,
      dropoff_address: data.endLabel || data.startLabel,
      pickup_date: data.date,
      pickup_time: data.time.padStart(5, "0"),
      passengers: data.passengers,
      luggage: data.luggage,
      hand_luggage: 0,
      flight_number: data.flight || null,
      notes: [
        `DAY TOUR — ${data.mode === "premade" ? "Premade tour" : "Custom day"}`,
        `Hours booked: ${data.hours}`,
        stopNames.length ? `Stops: ${stopNames.join(", ")}` : "No stops chosen",
        data.notes ? `\nCustomer notes: ${data.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      status: "pending_payment",
      payment_status: "unpaid",
      price: null,
      service_type: TOUR_SERVICE_TYPE,
      original_service_type: TOUR_SERVICE_TYPE,
      vehicle_class_id: data.vehicleClassId,
      vehicle_type: result.vehicleName,
      scenic_template_id: data.templateId ?? null,
      tour_name: tourName,
      tour_slug: tourSlug,
      tour_stops: stopNames,
      selected_pois: data.stops.map((s) => s.poiId).filter(Boolean),
      booked_hours: data.hours,
      hourly_hours: Math.round(data.hours),
      estimated_extra_miles: result.quote.extraMiles,
      distance_miles: result.quote.routeMiles,
      quoted_total: result.quote.total,
      quote_expires_at: new Date(Date.now() + holdMinutes * 60_000).toISOString(),
      pricing_snapshot: result.quote as any,
    };

    const res: any = await supabaseAdmin.from("bookings").insert(insert).select("id, booking_ref").maybeSingle();
    if (res.error || !res.data) {
      console.error("tour booking insert failed", res.error);
      throw new Error("Couldn't save your tour. Please try again.");
    }

    return { bookingRef, total: result.quote.total, holdMinutes };
  });

export type TourPaymentAmount = { amountPence: number; total: number; bookingRef: string } | { error: string };

/**
 * The payable amount for a saved tour, read from the server-side quote. The
 * checkout session itself is created by the shared booking payment function.
 */
export const getTourPaymentAmount = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingRef: string }) =>
    z.object({ bookingRef: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<TourPaymentAmount> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = data.bookingRef.toUpperCase();
    const res: any = await supabaseAdmin
      .from("bookings")
      .select("booking_ref, quoted_total, price, payment_status, quote_expires_at, status")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (res.error || !res.data) return { error: "We couldn't find that tour booking." };
    if (res.data.payment_status === "paid") return { error: "This tour is already paid." };

    const total = Number(res.data.price ?? res.data.quoted_total ?? 0);
    if (!Number.isFinite(total) || total < 1) {
      return { error: "This tour has no price yet. Please call us and we'll help." };
    }
    if (res.data.quote_expires_at && new Date(res.data.quote_expires_at).getTime() < Date.now()) {
      return { error: "This price has expired. Please build your tour again for an up-to-date price." };
    }
    return { amountPence: Math.round(total * 100), total, bookingRef: ref };
  });
