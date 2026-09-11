// Admin server functions for tour enquiries. Tour enquiries live in `bookings`
// with service_type = "private_tour"; status changes reuse the shared
// `setBookingStatusFn`, and this file adds the tour-specific pricing step.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { TOUR_SERVICE_TYPE, TOUR_QUOTED_STATUS } from "@/lib/tour-enquiries";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

export type TourEnquiryRow = {
  id: string;
  booking_ref: string;
  status: string;
  payment_status: string;
  customer_name: string;
  email: string;
  phone: string | null;
  pickup_date: string | null;
  pickup_time: string;
  passengers: number;
  luggage: number;
  price: number | null;
  price_quoted_at: string | null;
  tour_name: string | null;
  tour_slug: string | null;
  tour_stops: string[];
  flight_number: string | null;
  notes: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
};

export const listTourEnquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TourEnquiryRow[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("bookings")
      .select(
        "id, booking_ref, status, payment_status, customer_name, email, phone, pickup_date, pickup_time, passengers, luggage, price, price_quoted_at, tour_name, tour_slug, tour_stops, flight_number, notes, admin_notes, cancellation_reason, created_at",
      )
      .eq("service_type", TOUR_SERVICE_TYPE)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      price: r.price == null ? null : Number(r.price),
      tour_stops: Array.isArray(r.tour_stops) ? r.tour_stops.map((s: unknown) => String(s)) : [],
    }));
  });

/**
 * Saves the agreed tour price. The enquiry then moves to
 * "Confirmed – awaiting payment" and the customer is emailed the price plus a
 * link to pay and manage the booking.
 */
export const setTourEnquiryPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      price: z.number().positive().max(100_000),
      note: z.string().trim().max(1000).optional().nullable(),
      notifyCustomer: z.boolean().optional().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cur: any = await supabaseAdmin
      .from("bookings")
      .select("id, booking_ref, status, payment_status, customer_name, email, tour_name, pickup_date, pickup_time, passengers, service_type")
      .eq("id", data.id)
      .maybeSingle();
    if (cur.error || !cur.data) throw new Error("Tour enquiry not found");
    if (cur.data.service_type !== TOUR_SERVICE_TYPE) throw new Error("This booking is not a tour enquiry");

    const price = Math.round(data.price * 100) / 100;
    const upd: any = await supabaseAdmin
      .from("bookings")
      .update({
        price,
        price_quoted_at: new Date().toISOString(),
        ...(data.note ? { admin_notes: data.note } : {}),
      } as any)
      .eq("id", data.id);
    if (upd.error) throw new Error(upd.error.message);

    // Unpaid enquiries move to "awaiting payment"; a paid tour keeps its status.
    let status = String(cur.data.status ?? "new");
    if (cur.data.payment_status !== "paid" && status !== "cancelled" && status !== "rejected" && status !== "completed") {
      const rpc: any = await supabaseAdmin.rpc("set_booking_status", {
        _booking_id: data.id,
        _new_status: TOUR_QUOTED_STATUS,
        _actor_id: context.userId,
        _override: true,
      });
      if (rpc.error) throw new Error(rpc.error.message);
      const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      status = row?.status ?? TOUR_QUOTED_STATUS;
    }

    try {
      await context.supabase.from("activity_logs").insert({
        actor_id: context.userId,
        action: "tour_enquiry_priced",
        entity: "bookings",
        entity_id: data.id,
        diff: { price, status },
      });
    } catch { /* best-effort audit */ }

    if (data.notifyCustomer) {
      const { notifyTourQuoted } = await import("@/lib/notifications.server");
      await notifyTourQuoted({
        bookingId: data.id,
        bookingRef: cur.data.booking_ref,
        customerName: cur.data.customer_name,
        email: cur.data.email,
        tourName: cur.data.tour_name ?? "Your tour",
        pickupDate: cur.data.pickup_date,
        pickupTime: cur.data.pickup_time,
        passengers: cur.data.passengers ?? 1,
        price,
        adminNote: data.note ?? null,
      });
    }

    return { ok: true, price, status, emailed: !!data.notifyCustomer };
  });

/** Internal note saved against a tour enquiry (never shown to the customer). */
export const setTourEnquiryNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("bookings")
      .update({ admin_notes: data.note || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
