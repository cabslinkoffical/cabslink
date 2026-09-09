import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

// ---------------------------------------------------------------- endpoints

export const listDispatchEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("dispatch_endpoints")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDispatchEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(2).max(80),
        url: z.string().url().startsWith("https://", "The dispatch address must start with https://"),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = { name: data.name, url: data.url, active: data.active };
    const q = data.id
      ? (context.supabase as any).from("dispatch_endpoints").update(row).eq("id", data.id).select("*").single()
      : (context.supabase as any).from("dispatch_endpoints").insert(row).select("*").single();
    const { data: saved, error } = await q;
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteDispatchEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("dispatch_endpoints").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rotateDispatchSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await (context.supabase as any)
      .from("dispatch_endpoints")
      .update({ secret })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { secret };
  });

// ---------------------------------------------------------------- events

export const listDispatchEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("dispatch_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const retryDispatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("dispatch_events")
      .update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { deliverPendingDispatchEvents } = await import("./dispatch.server");
    return deliverPendingDispatchEvents();
  });

export const sendDispatchTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("dispatch_events").insert({
      endpoint_id: data.id,
      event_type: "dispatch.test",
      payload: { event: "dispatch.test", occurred_at: new Date().toISOString() },
    });
    if (error) throw new Error(error.message);
    const { deliverPendingDispatchEvents } = await import("./dispatch.server");
    return deliverPendingDispatchEvents();
  });

export const runDispatchDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { deliverPendingDispatchEvents } = await import("./dispatch.server");
    return deliverPendingDispatchEvents();
  });

// ---------------------------------------------------------------- dispatch users

export const listDispatchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("id, user_id, role")
      .eq("role", "dispatch");
    if (error) throw new Error(error.message);
    const out: { id: string; user_id: string; email: string; confirmed: boolean }[] = [];
    for (const r of roles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      out.push({
        id: r.id,
        user_id: r.user_id,
        email: u?.user?.email ?? "unknown",
        confirmed: Boolean(u?.user?.email_confirmed_at),
      });
    }
    return out;
  });

export const grantDispatchAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

    let invited = false;
    if (!user) {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (cErr) throw new Error(cErr.message);
      user = created?.user ?? undefined;
      invited = true;
    }
    if (!user) throw new Error("Could not create that account");

    const { error } = await (supabaseAdmin as any)
      .from("user_roles")
      .upsert({ user_id: user.id, role: "dispatch" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true, invited, email };
  });

export const revokeDispatchAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("user_roles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendDispatchPasswordSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hasRole, error: roleError } = await (supabaseAdmin as any).rpc("has_role", {
      _user_id: data.userId,
      _role: "dispatch",
    });
    if (roleError || !hasRole) throw new Error("This account does not have dispatch access.");
    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = userResult?.user?.email;
    if (userError || !email) throw new Error("Dispatch account not found.");
    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "https://www.cabslink.com/auth?setup=dispatch" },
    });
    if (linkError || !link?.properties?.action_link) throw new Error(linkError?.message ?? "Could not create the setup link.");
    const { getEmailAdapter } = await import("@/lib/email/adapter.server");
    const sent = await getEmailAdapter().send({
      to: email,
      subject: "Set up your CabsLink Dispatch password",
      text: `Set your CabsLink Dispatch password using this secure one-time link: ${link.properties.action_link}\n\nAfter setting it, sign in at https://cabs-flow-dispatch.lovable.app`,
      html: `<p>Your CabsLink Dispatch access is ready.</p><p><a href="${link.properties.action_link}">Set your password</a></p><p>After setting it, sign in at <a href="https://cabs-flow-dispatch.lovable.app">CabsLink Dispatch Board</a>.</p>`,
    });
    if (!sent.ok) throw new Error("The setup email could not be sent. Check the configured email service and try again.");
    return { ok: true, email };
  });
