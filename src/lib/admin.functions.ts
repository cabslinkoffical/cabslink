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
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [bookingsRes, messagesRes, vehiclesRes, driversRes, paymentsRes, recentRes] = await Promise.all([
      context.supabase.from("bookings").select("id, status, vehicle_type, pickup_address, dropoff_address, created_at, pickup_date, price, payment_status, deleted_at"),
      context.supabase.from("contact_messages").select("id, status"),
      context.supabase.from("vehicles").select("id, active"),
      context.supabase.from("drivers").select("id, status"),
      context.supabase.from("payments").select("id, amount, status, created_at, paid_at"),
      context.supabase.from("bookings").select("id, customer_name, pickup_date, status, vehicle_type, booking_ref, price").is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
    ]);

    const bookings = bookingsRes.data ?? [];
    const live = bookings.filter((b: any) => !b.deleted_at);
    const payments = paymentsRes.data ?? [];

    const totalRevenue = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const todayRevenue = payments.filter((p: any) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= todayStart).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const monthRevenue = payments.filter((p: any) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= monthStart).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pendingPayments = payments.filter((p: any) => p.status === "unpaid" || p.status === "partial").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const newToday = live.filter((b: any) => new Date(b.created_at) >= todayStart).length;

    // Monthly revenue (last 6 months)
    const monthly: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setMonth(next.getMonth() + 1);
      const sum = payments.filter((p: any) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= d && new Date(p.paid_at) < next).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      monthly.push({ month: d.toLocaleString("en", { month: "short" }), revenue: sum });
    }

    // Last 30 days bookings trend
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const b of live) {
      const key = (b.created_at as string).slice(0, 10);
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
        bookings: live.length,
        upcoming: live.filter((b: any) => ["new", "confirmed", "assigned", "pending_allocation"].includes(b.status) && b.pickup_date >= new Date().toISOString().slice(0, 10)).length,
        completed: live.filter((b: any) => b.status === "completed").length,
        cancelled: live.filter((b: any) => b.status === "cancelled").length,
        pendingAllocation: live.filter((b: any) => b.status === "new" || b.status === "pending_allocation").length,
        allocated: live.filter((b: any) => b.status === "assigned" || b.status === "confirmed").length,
        inProgress: live.filter((b: any) => b.status === "in_progress" || b.status === "on_way").length,
        bidding: live.filter((b: any) => b.status === "bidding").length,
        deleted: bookings.filter((b: any) => b.deleted_at).length,
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
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*, driver:drivers(id, full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const bookingStatusSchema = z.enum([
  "new", "confirmed", "assigned", "on_way", "completed", "cancelled",
  "pending_allocation", "in_progress", "bidding",
]);
const paymentStatusSchema = z.enum(["unpaid", "paid", "refunded", "partial", "failed"]);

export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        status: bookingStatusSchema.optional(),
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
    if (patch.status === "assigned" && patch.driver_id) patch.assigned_at = new Date().toISOString();
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
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["new", "read", "resolved"]) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("contact_messages").update({ status: data.status }).eq("id", data.id);
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

const vehicleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  tbms_id: z.string().nullable().optional(),
  vehicle_class: z.enum(["economy", "business", "first", "executive_v", "executive_van_8", "green"]).nullable().optional(),
  image_url: z.string().min(1).max(2000),
  description: z.string().max(2000).default(""),
  passengers: z.number().int().min(1).max(99),
  luggage: z.number().int().min(0).max(99),
  hand_luggage: z.number().int().min(0).max(99),
  base_fare: z.number().nullable().optional(),
  per_mile_rate: z.number().nullable().optional(),
  waiting_charge: z.number().nullable().optional(),
  meet_greet_enabled: z.boolean().default(false),
  price_per_hour: z.number().nullable().optional(),
  display_order: z.number().int().default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const upsertVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => vehicleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("vehicles").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    } else {
      const { data: row, error } = await context.supabase.from("vehicles").insert(data).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, id: (row as any).id as string };
    }
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("vehicles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
export const listDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("drivers").select("*, vehicle:vehicles(id, name)").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const driverSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  license_number: z.string().max(100).nullable().optional(),
  assigned_vehicle_id: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  available: z.boolean().default(true),
  photo_url: z.string().url().max(1000).nullable().optional().or(z.literal("")),
  notes: z.string().max(2000).nullable().optional(),
});

export const upsertDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => driverSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data };
    if (payload.email === "") payload.email = null;
    if (payload.photo_url === "") payload.photo_url = null;
    if (data.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("drivers").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("drivers").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("drivers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Customers (derived from bookings)
// =================================================================
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("bookings").select("customer_name, email, phone, price, pickup_date, status, created_at").is("deleted_at", null);
    if (error) throw new Error(error.message);
    const map = new Map<string, any>();
    for (const b of data ?? []) {
      const key = (b.email ?? "").toLowerCase();
      if (!key) continue;
      const existing = map.get(key) ?? { name: b.customer_name, email: b.email, phone: b.phone, bookings: 0, spend: 0, last: b.pickup_date, lastCreated: b.created_at };
      existing.bookings += 1;
      existing.spend += Number(b.price || 0);
      if (b.pickup_date > existing.last) existing.last = b.pickup_date;
      if (new Date(b.created_at) > new Date(existing.lastCreated)) existing.lastCreated = b.created_at;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastCreated).getTime() - new Date(a.lastCreated).getTime());
  });

// =================================================================
// Payments
// =================================================================
export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("payments").select("*, booking:bookings(id, booking_ref, customer_name)").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

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
    if (error) throw new Error(error.message);
    const { data: creds } = await context.supabase
      .from("site_credentials")
      .select("smtp_host, smtp_port, smtp_user, google_maps_api_key")
      .eq("id", 1)
      .maybeSingle();
    return { ...(data ?? {}), ...(creds ?? {}) } as any;
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

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => settingsSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Credentials live in an admin-only table so they are never publicly readable.
    const { smtp_host, smtp_port, smtp_user, google_maps_api_key, ...settings } = data;
    const { error } = await context.supabase.from("site_settings").update(settings).eq("id", 1);
    if (error) throw new Error(error.message);
    const { error: credError } = await context.supabase
      .from("site_credentials")
      .upsert({ id: 1, smtp_host: smtp_host ?? null, smtp_port: smtp_port ?? null, smtp_user: smtp_user ?? null, google_maps_api_key: google_maps_api_key ?? null }, { onConflict: "id" });
    if (credError) throw new Error(credError.message);
    return { ok: true };
  });


// =================================================================
// Users & roles
// =================================================================
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersErr) throw new Error(usersErr.message);
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
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account here.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Phase 2: Pricing rules
// =================================================================
export const listPricingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("pricing_rules").select("*, vehicle:vehicles(id, name)").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const pricingSchema = z
  .object({
    id: z.string().uuid().optional(),
    from_address: z.string().min(1).max(300),
    to_address: z.string().min(1).max(300),
    from_place_id: z.string().trim().min(1).max(300).nullable().optional(),
    to_place_id: z.string().trim().min(1).max(300).nullable().optional(),
    from_place_label: z.string().max(500).nullable().optional(),
    to_place_label: z.string().max(500).nullable().optional(),
    bidirectional: z.boolean().default(false),
    vehicle_id: z.string().uuid().nullable().optional(),
    price: z.coerce.number().min(0).max(100000),
    currency: z.string().max(10).default("GBP"),
    valid_from: z.string().nullable().optional(),
    valid_to: z.string().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (!v.active) return;
    if (!v.from_place_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["from_place_id"], message: "Pickup Place ID is required for active rules" });
    }
    if (!v.to_place_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to_place_id"], message: "Destination Place ID is required for active rules" });
    }
    if (!v.vehicle_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vehicle_id"], message: "Vehicle is required for active rules" });
    }
    if (!(Number(v.price) > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Fixed price must be > 0" });
    }
  });

export const upsertPricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pricingSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = {
      ...data,
      valid_from: data.valid_from || null,
      valid_to: data.valid_to || null,
      from_place_id: data.from_place_id || null,
      to_place_id: data.to_place_id || null,
      from_place_label: data.from_place_label || null,
      to_place_label: data.to_place_label || null,
    };
    if (data.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("pricing_rules").update(patch).eq("id", id);
      if (error) throw new Error(mapPricingRuleError(error));
    } else {
      const { error } = await context.supabase.from("pricing_rules").insert(payload);
      if (error) throw new Error(mapPricingRuleError(error));
    }
    return { ok: true };
  });

function mapPricingRuleError(err: any): string {
  const code = err?.code;
  const msg = err?.message ?? "Failed to save pricing rule";
  if (code === "23505") return "A conflicting active fixed-price rule already exists for this vehicle and route.";
  return msg;
}

export const deletePricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pricing_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
    const fromD = new Date(data.from);
    const toD = new Date(data.to);
    const [bRes, pRes] = await Promise.all([
      context.supabase.from("bookings").select("id, status, vehicle_type, pickup_address, dropoff_address, price, created_at, pickup_date").is("deleted_at", null).gte("created_at", fromD.toISOString()).lte("created_at", toD.toISOString()),
      context.supabase.from("payments").select("amount, status, paid_at, created_at").eq("status", "paid").gte("created_at", fromD.toISOString()).lte("created_at", toD.toISOString()),
    ]);
    const bookings = bRes.data ?? [];
    const payments = pRes.data ?? [];

    function bucket(dateStr: string) {
      const d = new Date(dateStr);
      if (data.granularity === "month") return d.toISOString().slice(0, 7);
      if (data.granularity === "week") {
        const tmp = new Date(d);
        const day = tmp.getUTCDay();
        const diff = (day + 6) % 7;
        tmp.setUTCDate(tmp.getUTCDate() - diff);
        return tmp.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    }

    const revMap = new Map<string, number>();
    for (const p of payments) {
      const k = bucket(p.paid_at ?? p.created_at);
      revMap.set(k, (revMap.get(k) ?? 0) + Number(p.amount || 0));
    }
    const bookMap = new Map<string, { date: string; total: number; completed: number; cancelled: number }>();
    for (const b of bookings) {
      const k = bucket(b.created_at);
      const e = bookMap.get(k) ?? { date: k, total: 0, completed: 0, cancelled: 0 };
      e.total += 1;
      if (b.status === "completed") e.completed += 1;
      if (b.status === "cancelled") e.cancelled += 1;
      bookMap.set(k, e);
    }

    const vehicleMap = new Map<string, number>();
    const routeMap = new Map<string, number>();
    for (const b of bookings) {
      vehicleMap.set(b.vehicle_type, (vehicleMap.get(b.vehicle_type) ?? 0) + 1);
      const r = `${b.pickup_address} → ${b.dropoff_address}`;
      routeMap.set(r, (routeMap.get(r) ?? 0) + 1);
    }

    const totalRev = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const completed = bookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
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
export const listActivityLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    entity: z.string().optional(),
    search: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.entity) q = q.eq("entity", data.entity);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) q = q.or(`actor_email.ilike.%${data.search}%,entity_id.ilike.%${data.search}%,action.ilike.%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

