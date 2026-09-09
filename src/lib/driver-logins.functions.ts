import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

async function getDriver(ctx: { supabase: any }, driverId: string) {
  const { data, error } = await (ctx.supabase as any)
    .from("drivers")
    .select("id, full_name, email, user_id")
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Driver not found");
  return data as { id: string; full_name: string; email: string | null; user_id: string | null };
}

/** Login state for every driver row, so admins can see who can sign in. */
export const listDriverLogins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("drivers")
      .select("id, user_id");
    if (error) throw new Error(error.message);
    const linked = (data ?? []).filter((d: any) => d.user_id);
    if (linked.length === 0) return [] as Array<{ driver_id: string; user_id: string; email: string | null; confirmed: boolean }>;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byId = new Map((list?.users ?? []).map((u) => [u.id, u]));
    return linked.map((d: any) => {
      const u = byId.get(d.user_id);
      return {
        driver_id: d.id as string,
        user_id: d.user_id as string,
        email: u?.email ?? null,
        confirmed: Boolean(u?.email_confirmed_at),
      };
    });
  });

/**
 * Creates (or reuses) an auth account for a driver and links it to the driver row.
 * Either sets the password straight away, or emails an invitation to set one.
 */
export const createDriverLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        driverId: z.string().uuid(),
        email: z.string().email(),
        password: z.string().min(10).max(72).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const driver = await getDriver(context, data.driverId);
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

    let invited = false;
    if (!user) {
      if (data.password) {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: data.password,
          email_confirm: true,
        });
        if (error) throw new Error(error.message);
        user = created?.user ?? undefined;
      } else {
        const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
        if (error) throw new Error(error.message);
        user = created?.user ?? undefined;
        invited = true;
      }
    } else if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
    }
    if (!user) throw new Error("Could not create that login");

    // One login per driver.
    const { data: clash } = await (supabaseAdmin as any)
      .from("drivers")
      .select("id, full_name")
      .eq("user_id", user.id)
      .neq("id", driver.id)
      .maybeSingle();
    if (clash) throw new Error(`That login is already used by ${clash.full_name}`);

    const patch: Record<string, unknown> = { user_id: user.id };
    if (!driver.email) patch.email = email;
    const { error: linkError } = await (supabaseAdmin as any).from("drivers").update(patch).eq("id", driver.id);
    if (linkError) throw new Error(linkError.message);

    return { ok: true, email, invited, userId: user.id };
  });

/** Sets a password for a driver login the admin can hand over directly. */
export const setDriverLoginPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ driverId: z.string().uuid(), password: z.string().min(10).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const driver = await getDriver(context, data.driverId);
    if (!driver.user_id) throw new Error("This driver has no login yet");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(driver.user_id);
    const email = userResult?.user?.email;
    if (!email) throw new Error("Driver login not found");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(driver.user_id, {
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

/** Emails the driver a link to set or reset their own password. */
export const sendDriverPasswordSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ driverId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const driver = await getDriver(context, data.driverId);
    if (!driver.user_id) throw new Error("This driver has no login yet");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(driver.user_id);
    const email = userResult?.user?.email;
    if (!email) throw new Error("Driver login not found");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

/** Unlinks the login from the driver row. The auth account itself is kept. */
export const unlinkDriverLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ driverId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("drivers")
      .update({ user_id: null })
      .eq("id", data.driverId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
