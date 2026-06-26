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

// --- Identity ---
export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });

// --- Dashboard ---
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [bookingsRes, messagesRes, vehiclesRes, recentBookingsRes] = await Promise.all([
      context.supabase.from("bookings").select("id, status, vehicle_type, created_at, pickup_date"),
      context.supabase.from("contact_messages").select("id, status, created_at"),
      context.supabase.from("vehicles").select("id, active"),
      context.supabase.from("bookings").select("id, customer_name, pickup_date, status, vehicle_type").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
    ]);

    const bookings = bookingsRes.data ?? [];
    const messages = messagesRes.data ?? [];
    const vehicles = vehiclesRes.data ?? [];

    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const b of bookings) {
      const key = (b.created_at as string).slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    const byVehicle = new Map<string, number>();
    for (const b of bookings) {
      byVehicle.set(b.vehicle_type, (byVehicle.get(b.vehicle_type) ?? 0) + 1);
    }

    const byStatus: Record<string, number> = {};
    for (const b of bookings) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;

    return {
      totals: {
        bookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === "new" || b.status === "confirmed").length,
        completedBookings: bookings.filter(b => b.status === "completed").length,
        messages: messages.length,
        unreadMessages: messages.filter(m => m.status === "new").length,
        vehiclesTotal: vehicles.length,
        vehiclesActive: vehicles.filter(v => v.active).length,
      },
      byStatus,
      seriesDaily: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
      byVehicle: Array.from(byVehicle.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      recentBookings: recentBookingsRes.data ?? [],
    };
  });

// --- Bookings ---
export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const bookingStatusSchema = z.enum(["new", "confirmed", "assigned", "on_way", "completed", "cancelled"]);

export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        status: bookingStatusSchema.optional(),
        notes: z.string().nullable().optional(),
      }),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("bookings").update(data.patch).eq("id", data.id);
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

// --- Messages ---
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "read", "resolved"]),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("contact_messages").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("contact_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Vehicles ---
export const listVehiclesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("vehicles")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const vehicleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  image_url: z.string().url().max(500),
  description: z.string().max(2000).default(""),
  passengers: z.number().int().min(1).max(99),
  luggage: z.number().int().min(0).max(99),
  hand_luggage: z.number().int().min(0).max(99),
  price_per_hour: z.number().nullable().optional(),
  display_order: z.number().int().default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const upsertVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => vehicleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("vehicles").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("vehicles").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("vehicles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Users & roles ---
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
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.admin) {
      throw new Error("You cannot remove your own admin role.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { error } = await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.userId, role: "admin" },
        { onConflict: "user_id,role" }
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account here.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
