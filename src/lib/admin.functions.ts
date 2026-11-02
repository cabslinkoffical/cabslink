import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

// =================================================================
// Identity
// =================================================================
export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });

// =================================================================
// Dashboard
// =================================================================
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    // Every day/month boundary is a UK calendar boundary (Europe/London).
    const { ukDate, ukDayStart, ukMonthStart, ukRange, addDays } = await import("@/lib/uk-time");
    const { bookingInTab } = await import("@/lib/admin-bookings");
    const { TOUR_SERVICE_TYPE } = await import("@/lib/tour-enquiries");
    const today = ukDate();
    const todayStart = ukDayStart(today);
    const monthStart = ukDayStart(ukMonthStart(0));

    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    const { netRevenue, revenueInWindow, SETTLED_PAYMENT_STATUSES } = await import("@/lib/revenue");
    const sb = context.supabase;
    // Complete paginated reads: totals never silently stop at the response cap.
    const [bookings, messages, vehicles, drivers, payments, recentRes] = await Promise.all([
      fetchAllPages<any>((a, z) => sb.from("bookings").select("id, status, service_type, vehicle_type, pickup_address, dropoff_address, created_at, pickup_date, price, payment_status, deleted_at, email").order("id").range(a, z)),
      fetchAllPages<any>((a, z) => sb.from("contact_messages").select("id, status").or('subject.is.null,and(subject.not.ilike."Tour booking:*",subject.not.ilike."Cancellation request:*")').order("id").range(a, z)),
      fetchAllPages<any>((a, z) => sb.from("vehicles").select("id, active").order("id").range(a, z)),
      fetchAllPages<any>((a, z) => sb.from("drivers").select("id, status").order("id").range(a, z)),
      fetchAllPages<any>((a, z) => sb.from("payments").select("id, amount, refunded_amount, status, created_at, paid_at").order("id").range(a, z)),
      sb.from("bookings").select("id, customer_name, pickup_date, status, vehicle_type, booking_ref, price").is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
    ]);
    if (recentRes.error) throw new Error(recentRes.error.message);
    const vehiclesRes = { data: vehicles };
    const driversRes = { data: drivers };
    const messagesRes = { data: messages };

    const live = bookings.filter((b: any) => !b.deleted_at);
    // Transfer figures use exactly the booking-list tab rules (tours are counted on their own).
    const transfers = live.filter((b: any) => b.service_type !== TOUR_SERVICE_TYPE);
    const tours = live.filter((b: any) => b.service_type === TOUR_SERVICE_TYPE);
    const inTab = (tab: any) => bookings.filter((b: any) => bookingInTab(b, tab, today)).length;
    // Settled money only, net of refunds, dated by settlement (paid_at, else created_at).
    const settled = payments.filter((p: any) => (SETTLED_PAYMENT_STATUSES as readonly string[]).includes(p.status));
    const nowIso = new Date().toISOString();

    const totalRevenue = Math.round(settled.reduce((s: number, p: any) => s + netRevenue(p), 0) * 100) / 100;
    const todayRevenue = revenueInWindow(settled, todayStart.toISOString(), nowIso);
    const monthRevenue = revenueInWindow(settled, monthStart.toISOString(), nowIso);
    const pendingPayments = payments.filter((p: any) => p.status === "unpaid" || p.status === "partial").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const newToday = transfers.filter((b: any) => new Date(b.created_at) >= todayStart).length;

    // Monthly revenue (last 6 UK calendar months, current month last)
    const monthly: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const first = ukMonthStart(i);
      const [y, m] = first.split("-").map(Number);
      const last = addDays(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10), -1);
      const { startIso, endIso } = ukRange(first, last);
      const sum = revenueInWindow(settled, startIso, new Date(new Date(endIso).getTime() - 1).toISOString());
      monthly.push({ month: new Date(Date.UTC(y, m - 1, 15)).toLocaleString("en-GB", { month: "short", timeZone: "UTC" }), revenue: sum });
    }

    // Last 30 UK days bookings trend (by UK creation date)
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) byDay.set(addDays(today, -i), 0);
    for (const b of live) {
      const key = ukDate(b.created_at);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    const byVehicle = new Map<string, number>();
    const byPickup = new Map<string, number>();
    const byDropoff = new Map<string, number>();
    for (const b of live) {
      byVehicle.set(b.vehicle_type, (byVehicle.get(b.vehicle_type) ?? 0) + 1);
      byPickup.set(b.pickup_address, (byPickup.get(b.pickup_address) ?? 0) + 1);
      byDropoff.set(b.dropoff_address, (byDropoff.get(b.dropoff_address) ?? 0) + 1);
    }

    const byStatus: Record<string, number> = {};
    for (const b of live) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;

    // Customers (unique by email from bookings)
    const customers = new Set(live.map((b: any) => (b.email ?? "").toLowerCase()).filter(Boolean));

    return {
      totals: {
        bookings: transfers.length,
        tours: tours.length,
        upcoming: inTab("upcoming"),
        completed: inTab("completed"),
        cancelled: inTab("cancelled"),
        // "New" tab: new, awaiting allocation and bidding — bookings still without a driver.
        pendingAllocation: inTab("new"),
        awaitingPayment: inTab("awaiting_payment"),
        allocated: inTab("assigned") + inTab("confirmed"),
        inProgress: inTab("on_road"),
        bidding: transfers.filter((b: any) => b.status === "bidding").length,
        deleted: inTab("deleted"),
        newToday,
        totalRevenue, todayRevenue, monthRevenue, pendingPayments,
        vehiclesTotal: vehiclesRes.data?.length ?? 0,
        vehiclesActive: (vehiclesRes.data ?? []).filter((v: any) => v.active).length,
        driversActive: (driversRes.data ?? []).filter((d: any) => d.status === "active").length,
        customersActive: customers.size,
        unreadMessages: (messagesRes.data ?? []).filter((m: any) => m.status === "new").length,
      },
      byStatus,
      seriesDaily: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
      monthly,
      byVehicle: Array.from(byVehicle.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      topPickups: Array.from(byPickup.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      topDropoffs: Array.from(byDropoff.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      recentBookings: recentRes.data ?? [],
    };
  });

// =================================================================
// Bookings
// =================================================================
export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    return await fetchAllPages<any>((a, z) => context.supabase
      .from("bookings")
      .select("*, driver:drivers(id, full_name)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(a, z));
  });

const paymentStatusSchema = z.enum(["unpaid", "paid", "refunded", "partial", "failed"]);

export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        // Status changes go only through setBookingStatusFn (locks, reasons, audit trail).
        payment_status: paymentStatusSchema.optional(),
        driver_id: z.string().uuid().nullable().optional(),
        price: z.number().nullable().optional(),
        admin_notes: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { ...data.patch };
    const { error } = await context.supabase.from("bookings").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const softDeleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), restore: z.boolean().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("bookings").update({ deleted_at: data.restore ? null : new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Messages (kept for completeness)
// =================================================================

const tourBookingStatusSchema = z.enum([
  "new", "read", "pending", "booked", "paid", "confirmed", "resolved", "cancelled",
]);

export const updateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "read", "resolved"]).optional(),
      tour_status: tourBookingStatusSchema.optional(),
    })
      .refine((d) => d.status !== undefined || d.tour_status !== undefined, {
        message: "Either status or tour_status is required",
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.tour_status !== undefined) patch.tour_status = data.tour_status;
    const { error } = await context.supabase.from("contact_messages").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("contact_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Driver applications received through the website
// =================================================================


// =================================================================
// Vehicles
// =================================================================
export const listVehiclesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("vehicles").select("*").order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// =================================================================
// Addresses
// =================================================================
export const listAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("addresses").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  label: z.string().trim().max(200).nullable().optional(),
  place_id: z.string().trim().max(300).nullable().optional(),
  comparable_value: z.string().max(200).nullable().optional(),
  pickup_charge: z.coerce.number().min(0).max(100000).default(0),
  dropoff_charge: z.coerce.number().min(0).max(100000).default(0),
  notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => addressSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = {
      ...data,
      place_id: (data.place_id && data.place_id.trim()) || null,
      label: (data.label && data.label.trim()) || null,
      updated_by: context.userId,
    };
    if (data.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("addresses").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("addresses").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("addresses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Banned addresses
// =================================================================
export const listBannedAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("banned_addresses").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const bannedSchema = z.object({
  id: z.string().uuid().optional(),
  address: z.string().min(1).max(500),
  reason: z.string().max(500).nullable().optional(),
  admin_notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertBannedAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => bannedSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("banned_addresses").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("banned_addresses").insert({ ...data, created_by: context.userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteBannedAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("banned_addresses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Drivers
// =================================================================
/**
 * Read-only view of the drivers created in the dispatch panel, with the
 * essential details plus how many jobs they currently hold. Admin does not
 * create or assign drivers — that stays in dispatch.
 */
export const listDispatchDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [driversRes, jobsRes] = await Promise.all([
      context.supabase
        .from("drivers")
        .select("id, full_name, email, phone, status, available, license_number, photo_url, created_at, vehicle:vehicles(id, name)")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("bookings")
        .select("driver_id, status, pickup_date")
        .not("driver_id", "is", null),
    ]);
    if (driversRes.error) throw new Error(driversRes.error.message);
    const jobs = (jobsRes.data ?? []) as Array<{ driver_id: string; status: string; pickup_date: string | null }>;
    const active = new Set(["assigned", "driver_en_route", "passenger_on_board"]);
    return (driversRes.data ?? []).map((d: any) => {
      const mine = jobs.filter((j) => j.driver_id === d.id);
      const upcoming = mine
        .filter((j) => active.has(j.status))
        .map((j) => j.pickup_date)
        .filter(Boolean)
        .sort() as string[];
      return {
        ...d,
        vehicleName: d.vehicle?.name ?? null,
        activeJobs: mine.filter((j) => active.has(j.status)).length,
        completedJobs: mine.filter((j) => j.status === "completed").length,
        nextJobDate: upcoming[0] ?? null,
      };
    });
  });


// =================================================================
// Customers (derived from bookings)
// =================================================================

// =================================================================
// Payments
// =================================================================

const paymentSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid().nullable().optional(),
  amount: z.number().min(0),
  currency: z.string().default("GBP"),
  method: z.string().max(80).nullable().optional(),
  status: paymentStatusSchema.default("unpaid"),
  reference: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const upsertPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => paymentSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data };
    if (payload.status === "paid" && !payload.paid_at) payload.paid_at = new Date().toISOString();
    if (data.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("payments").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("payments").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Coupons
// =================================================================
export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  discount_type: z.enum(["fixed", "percentage"]).default("percentage"),
  discount_value: z.number().min(0),
  min_booking_amount: z.number().min(0).default(0),
  usage_limit: z.number().int().min(0).nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  active: z.boolean().default(true),
  notes: z.string().max(500).nullable().optional(),
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => couponSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, code: data.code.toUpperCase() };
    if (data.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("coupons").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("coupons").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Settings
// =================================================================
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(`Settings could not be loaded: ${error.message}`);
    if (!data) throw new Error("Settings could not be loaded. Please refresh before editing.");
    // An incomplete load must never reach an editable form: saving it would clear the missing values.
    const { data: creds, error: credsError } = await context.supabase
      .from("site_credentials")
      .select("smtp_host, smtp_port, smtp_user, google_maps_api_key")
      .eq("id", 1)
      .maybeSingle();
    if (credsError) throw new Error(`Settings could not be loaded completely (credentials): ${credsError.message}. Please refresh before editing.`);
    return { ...data, ...(creds ?? {}) } as any;
  });

const settingsSchema = z.object({
  company_name: z.string().min(1).max(120),
  logo_url: z.string().nullable().optional(),
  favicon_url: z.string().nullable().optional(),
  primary_color: z.string().max(20),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  business_address: z.string().nullable().optional(),
  currency: z.string().max(10),
  currency_symbol: z.string().max(6).default("£"),
  timezone: z.string().max(60),
  tax_enabled: z.boolean().default(false),
  tax_percentage: z.coerce.number().min(0).max(100),
  tax_label: z.string().max(40).default("VAT"),
  cancellation_policy: z.string().nullable().optional(),
  maintenance_mode: z.boolean(),
  smtp_host: z.string().nullable().optional(),
  smtp_port: z.number().int().nullable().optional(),
  smtp_user: z.string().nullable().optional(),
  google_maps_api_key: z.string().nullable().optional(),
  bing_site_verification: z.string().trim().max(200).regex(/^[A-Za-z0-9_-]*$/, "Paste only the code from the Bing tag").nullable().optional(),
  poi_corridor_enabled: z.boolean().default(false),
  poi_corridor_radius_miles: z.coerce.number().min(0).max(200).default(15),
  poi_corridor_max_pois: z.coerce.number().int().min(0).max(50).default(8),
  child_seat_fee_pence: z.coerce.number().int().min(0).max(100000).default(0),
  meet_greet_fee_pence: z.coerce.number().int().min(0).max(100000).default(0),
  return_journey_fee_pence: z.coerce.number().int().min(0).max(1000000).default(0),
  policy_non_refundable_percent: z.coerce.number().min(0).max(100).default(5),
  policy_non_refundable_min_pence: z.coerce.number().int().min(0).max(1000000).default(200),
  policy_flexible_percent: z.coerce.number().min(0).max(100).default(12),
  policy_flexible_min_pence: z.coerce.number().int().min(0).max(1000000).default(400),
});

/**
 * Split a settings save into the two groups, keeping only fields the caller
 * actually sent: an omitted field means "unchanged", an explicit null or
 * empty value clears it. Defaults never overwrite stored values.
 */
export function settingsSavePayload(raw: unknown) {
  const parsed = settingsSchema.parse(raw) as Record<string, unknown>;
  const sent = new Set(Object.keys((raw ?? {}) as Record<string, unknown>).filter((k) => (raw as any)[k] !== undefined));
  const CRED_KEYS = ["smtp_host", "smtp_port", "smtp_user", "google_maps_api_key"];
  const settings: Record<string, unknown> = {};
  const credentials: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!sent.has(k)) continue;
    (CRED_KEYS.includes(k) ? credentials : settings)[k] = v ?? null;
  }
  return { settings, credentials };
}

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => settingsSavePayload(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { settings, credentials } = data;
    // Both groups are saved in one database transaction: either everything
    // is stored or nothing changes. Credentials stay in their admin-only table.
    const { error } = await (context.supabase as any).rpc("admin_save_settings", {
      p_settings: settings,
      p_credentials: credentials,
    });
    if (error) throw new Error(`Settings were not saved: ${error.message}`);
    const { smtp_host, smtp_port, smtp_user, google_maps_api_key } = credentials as any;
    await logAdminAction(context, "settings_update", "site_settings", "1", {
      after: settings,
      credentials_changed: { smtp_host: smtp_host != null, smtp_port: smtp_port != null, smtp_user: smtp_user != null, google_maps_api_key: google_maps_api_key != null },
    });
    return { ok: true };
  });


/** Best-effort audit row for sensitive admin actions. */
export async function logAdminAction(
  context: { supabase: any; userId: string; claims?: any },
  action: string,
  entity: string,
  entityId: string | null,
  diff: Record<string, unknown>,
) {
  try {
    // activity_logs has no insert policy for signed-in users; write with the
    // service role after the caller has already been verified as an admin.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("activity_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action,
      entity,
      entity_id: entityId,
      diff,
    });
  } catch (e) {
    console.error("[admin] activity log failed", action, e);
  }
}

// =================================================================
// Users & roles
// =================================================================
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allUsers: any[] = [];
    for (let page = 1; page <= 500; page++) {
      const { data: pageData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (usersErr) throw new Error(usersErr.message);
      const batch = pageData?.users ?? [];
      allUsers.push(...batch);
      if (batch.length < 200) break;
    }
    const usersData = { users: allUsers };
    const { data: rolesData, error: rolesErr } = await context.supabase.from("user_roles").select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);
    const roleMap = new Map<string, string[]>();
    for (const r of rolesData ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return (usersData.users ?? []).map(u => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.admin) throw new Error("You cannot remove your own admin role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    await logAdminAction(context, data.admin ? "role_grant" : "role_revoke", "user_roles", data.userId, { role: "admin", granted: data.admin });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account here.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAdminAction(context, "user_delete", "auth.users", data.userId, { email: before?.user?.email ?? null });
    return { ok: true };
  });

/**
 * Issues a fresh confirmation link for a booking. The old link stops working
 * immediately because the per-booking salt (and so the stored hash) changes.
 */
export const regenerateBookingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ bookingId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deriveConfirmationToken } = await import("@/lib/booking-confirmation.server");
    const { data: b, error } = await (supabaseAdmin as any).from("bookings").select("id, booking_ref").eq("id", data.bookingId).maybeSingle();
    if (error || !b) throw new Error("Booking not found");
    const salt = crypto.randomUUID();
    const derived = deriveConfirmationToken(b.id, b.booking_ref, salt);
    const { error: upErr } = await (supabaseAdmin as any)
      .from("bookings")
      .update({ confirmation_salt: salt, confirmation_token_hash: derived.hash, confirmation_token_expires_at: derived.expiresAt })
      .eq("id", b.id);
    if (upErr) throw new Error(upErr.message);
    await logAdminAction(context, "booking_link_regenerated", "bookings", b.id, { booking_ref: b.booking_ref });
    return { path: `/booking/${derived.token}`, expiresAt: derived.expiresAt };
  });

// =================================================================
// Phase 2: Reports
// =================================================================
const reportInput = z.object({
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export const getReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reportInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Date-only inputs cover whole UK days (inclusive), matching Analytics.
    const { ukDayStart, addDays, ukBucket: bucketOf } = await import("@/lib/uk-time");
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateOnly.test(data.from) || !dateOnly.test(data.to)) throw new Error("Pick a start and end date");
    if (data.to < data.from) throw new Error("End date must be on or after the start date");
    const fromD = ukDayStart(data.from);
    const toD = new Date(ukDayStart(addDays(data.to, 1)).getTime() - 1);
    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    const { netRevenue, revenueByBucket, settlementWindowFilter, SETTLED_PAYMENT_STATUSES } = await import("@/lib/revenue");
    const fromIso = fromD.toISOString();
    const toIso = toD.toISOString();
    const [bookings, payments] = await Promise.all([
      fetchAllPages<any>((a, z) => context.supabase.from("bookings").select("id, status, vehicle_type, pickup_address, dropoff_address, price, created_at, pickup_date").is("deleted_at", null).gte("created_at", fromIso).lte("created_at", toIso).order("id").range(a, z)),
      // Revenue is selected by settlement time — the same timestamp used for its buckets.
      fetchAllPages<any>((a, z) => context.supabase.from("payments").select("id, amount, refunded_amount, status, paid_at, created_at")
        .in("status", SETTLED_PAYMENT_STATUSES as unknown as ("paid" | "partial" | "refunded")[])
        .or(settlementWindowFilter(fromIso, toIso)).order("id").range(a, z)),
    ]);

    const bucket = (dateStr: string) => bucketOf(dateStr, data.granularity);

    const revMap = revenueByBucket(payments, bucket);
    const bookMap = new Map<string, { date: string; total: number; completed: number; cancelled: number }>();
    for (const b of bookings) {
      const k = bucket(b.created_at);
      const e = bookMap.get(k) ?? { date: k, total: 0, completed: 0, cancelled: 0 };
      e.total += 1;
      if (b.status === "completed") e.completed += 1;
      if (b.status === "cancelled" || b.status === "rejected") e.cancelled += 1;
      bookMap.set(k, e);
    }

    const vehicleMap = new Map<string, number>();
    const routeMap = new Map<string, number>();
    for (const b of bookings) {
      vehicleMap.set(b.vehicle_type, (vehicleMap.get(b.vehicle_type) ?? 0) + 1);
      const r = `${b.pickup_address} → ${b.dropoff_address}`;
      routeMap.set(r, (routeMap.get(r) ?? 0) + 1);
    }

    const totalRev = Math.round(payments.reduce((s: number, p: any) => s + netRevenue(p), 0) * 100) / 100;
    const completed = bookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;
    const avgFare = bookings.length ? bookings.reduce((s, b) => s + Number(b.price || 0), 0) / bookings.length : 0;

    return {
      kpi: {
        revenue: totalRev,
        bookings: bookings.length,
        completed,
        cancelled,
        cancellationRate: bookings.length ? cancelled / bookings.length : 0,
        avgFare,
      },
      revenueSeries: Array.from(revMap.entries()).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date)),
      bookingsSeries: Array.from(bookMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      topVehicles: Array.from(vehicleMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      topRoutes: Array.from(routeMap.entries()).map(([route, count]) => ({ route, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    };
  });

// =================================================================
// Phase 2: Activity logs
// =================================================================


// =================================================================
// Cancellations & refund requests
// =================================================================
const cancellationStatusSchema = z.enum([
  "pending", "in_review", "approved", "refunded", "declined", "completed",
]);


export const updateCancellationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: cancellationStatusSchema.optional(),
      refund_amount: z.number().min(0).max(100000).nullable().optional(),
      admin_notes: z.string().max(4000).nullable().optional(),
      cancel_booking: z.boolean().optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cancellationDecision } = await import("@/lib/cancellation-rules");

    const reqRes: any = await supabaseAdmin.from("cancellation_requests").select("*").eq("id", data.id).maybeSingle();
    if (reqRes.error || !reqRes.data) throw new Error("Cancellation request not found");
    const req = reqRes.data;
    const bRes: any = req.booking_id
      ? await supabaseAdmin.from("bookings").select("id, booking_ref, status, payment_status, price, customer_name, email").eq("id", req.booking_id).maybeSingle()
      : await supabaseAdmin.from("bookings").select("id, booking_ref, status, payment_status, price, customer_name, email").eq("booking_ref", req.booking_ref).maybeSingle();
    const booking = bRes.data ?? null;

    const status = data.status ?? req.status;
    const decision = cancellationDecision({
      previousStatus: req.status,
      nextStatus: status,
      refundAmount: data.refund_amount ?? req.refund_amount ?? null,
      bookingPrice: booking?.price == null ? null : Number(booking.price),
      bookingStatus: booking?.status ?? null,
      paymentStatus: booking?.payment_status ?? null,
      cancelBooking: data.cancel_booking,
    });
    if (decision.error) throw new Error(decision.error);

    // 1. Refund the card(s) through Stripe when the decision is "refunded".
    let refundNote: string | null = null;
    if (decision.issueRefund && booking) {
      const { issueCancellationRefund } = await import("@/lib/cancellation-refunds.server");
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      const result = await issueCancellationRefund({
        db: supabaseAdmin,
        requestId: req.id,
        bookingId: booking.id,
        refundPence: Math.round(decision.refundAmount * 100),
        actorId: context.userId,
        stripeFor: (env) => createStripeClient(env as any),
        stripeErrorMessage: getStripeErrorMessage,
      });
      refundNote = result.note;
    }

    // 2. Cancel the booking itself through the audited status function.
    let transitionId: string | null = null;
    if (decision.cancelBooking && booking) {
      const rpc: any = await supabaseAdmin.rpc("set_booking_status", {
        _booking_id: booking.id,
        _new_status: "cancelled",
        _actor_id: context.userId,
        _reason: `Customer cancellation: ${req.reason}`,
        _override: true,
      });
      if (rpc.error) throw new Error(`The booking could not be cancelled: ${rpc.error.message}`);
      const r = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      transitionId = r?.changed ? r.transition_id : null;
    }

    // 3. Save the decision on the request.
    const notes = [data.admin_notes !== undefined ? data.admin_notes : req.admin_notes, refundNote].filter(Boolean).join("\n");
    const { error } = await supabaseAdmin
      .from("cancellation_requests")
      .update({
        status,
        refund_amount: decision.issueRefund || data.refund_amount !== undefined ? decision.refundAmount || data.refund_amount || null : req.refund_amount,
        admin_notes: notes || null,
        handled_by: context.userId,
        handled_at: new Date().toISOString(),
        booking_id: req.booking_id ?? booking?.id ?? null,
      } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // 4. Tell the customer their booking is cancelled.
    if (transitionId && booking?.email) {
      try {
        const { notifyStatusChange } = await import("@/lib/notifications.server");
        const full: any = (await supabaseAdmin.from("bookings").select("*").eq("id", booking.id).maybeSingle()).data;
        await notifyStatusChange({
          bookingRef: full.booking_ref, status: full.status, paymentMode: "manual",
          customerName: full.customer_name, customerEmail: full.email, customerPhone: full.phone,
          pickupAddress: full.pickup_address, dropoffAddress: full.dropoff_address,
          pickupDate: full.pickup_date, pickupTime: full.pickup_time, vehicleType: full.vehicle_type,
          passengers: full.passengers, luggage: full.luggage, flightNumber: full.flight_number,
          meetGreet: !!full.meet_greet, childSeat: !!full.child_seat, returnJourney: !!full.return_journey,
          distanceMiles: full.distance_miles, price: full.price, notes: full.notes,
          cancellationReason: full.cancellation_reason,
        } as any, booking.id, "cancelled" as any, transitionId);
      } catch (e) { console.error("cancellation email failed", e); }
    }
    return { ok: true, bookingCancelled: !!transitionId, refundNote };
  });

export const deleteCancellationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("cancellation_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// =================================================================
// Change (amendment) requests & top-ups / refunds
// =================================================================
const amendmentStatusSchema = z.enum([
  "pending_payment", "awaiting_refund", "applied", "declined",
]);


export const updateBookingAmendment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: amendmentStatusSchema.optional(),
      refund_amount: z.number().min(0).max(100000).nullable().optional(),
      admin_notes: z.string().max(4000).nullable().optional(),
      mark_paid: z.boolean().optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.refund_amount !== undefined) patch.refund_amount = data.refund_amount;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;

    if (Object.keys(patch).length) {
      const { error } = await context.supabase
        .from("booking_amendments")
        .update(patch)
        .eq("id", data.id)
        .select("booking_ref")
        .maybeSingle();
      if (error) throw new Error(error.message);
    }

    // Money is recorded in the payments ledger; the booking's payment state is
    // derived from what is actually held against the current fare.
    if (data.mark_paid || data.status === "applied") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { settleAmendmentPayment } = await import("@/lib/amendment-settlement.server");
      try {
        const res = await settleAmendmentPayment({ db: supabaseAdmin, amendmentId: data.id, markPaid: !!data.mark_paid, actorId: context.userId });
        return { ok: true, recordedPence: res.recordedPence, paymentStatus: res.paymentStatus };
      } catch (e) {
        throw new Error(`Request saved, but the payment could not be settled: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { ok: true };
  });

export const deleteBookingAmendment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("booking_amendments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
