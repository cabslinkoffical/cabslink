import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

export type AdminNotification = {
  id: string;
  kind: "booking" | "message" | "driver";
  title: string;
  subtitle: string;
  createdAt: string;
  /** Admin route the notification links to. */
  href: string;
};

/**
 * Live feed for the admin bell: newest bookings, unread contact messages and
 * pending driver applications, newest first. Read-only and admin-gated.
 */
export const listAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const [bookings, messages, drivers] = await Promise.all([
      context.supabase
        .from("bookings")
        .select("id, booking_ref, customer_name, pickup_address, dropoff_address, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(15),
      context.supabase
        .from("contact_messages")
        .select("id, name, subject, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      context.supabase
        .from("driver_applications")
        .select("id, full_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
        .then((r: any) => r)
        .catch(() => ({ data: [] as any[] })),
    ]);

    const items: AdminNotification[] = [];

    for (const b of (bookings.data ?? []) as any[]) {
      items.push({
        id: `booking:${b.id}`,
        kind: "booking",
        title: `New booking ${b.booking_ref ?? ""}`.trim(),
        subtitle: [b.customer_name, b.pickup_address ? `${b.pickup_address} → ${b.dropoff_address ?? ""}` : null]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 120),
        createdAt: b.created_at,
        href: "/cabs-booking-pannel/bookings",
      });
    }

    for (const m of (messages.data ?? []) as any[]) {
      items.push({
        id: `message:${m.id}`,
        kind: "message",
        title: m.subject ? `Message: ${m.subject}` : "New message",
        subtitle: [m.name, (m.message ?? "").replace(/\s+/g, " ")].filter(Boolean).join(" · ").slice(0, 120),
        createdAt: m.created_at,
        href: "/cabs-booking-pannel/messages",
      });
    }

    for (const d of ((drivers as any)?.data ?? []) as any[]) {
      items.push({
        id: `driver:${d.id}`,
        kind: "driver",
        title: "Driver application",
        subtitle: `${d.full_name ?? "Applicant"} · ${d.status ?? "new"}`,
        createdAt: d.created_at,
        href: "/cabs-booking-pannel/drivers",
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { items: items.slice(0, 30), fetchedAt: new Date().toISOString() };
  });
