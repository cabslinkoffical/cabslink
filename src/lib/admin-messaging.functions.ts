import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const input = z.object({
  scope: z.enum(["message", "booking"]),
  targetId: z.string().uuid(),
  templateId: z.string().min(1).max(60),
  /** Final subject/body as reviewed by the admin (placeholders already filled). */
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(10).max(6000),
});

/**
 * Sends a pre-written (optionally edited) email to the customer behind a
 * contact message or a booking. Admin-only; every send is written to
 * notification_log so the Emails timeline shows it.
 */
export const sendCannedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => input.parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let recipient: string | null = null;
    let bookingId: string | null = null;

    if (data.scope === "booking") {
      const res: any = await supabaseAdmin
        .from("bookings")
        .select("id, email")
        .eq("id", data.targetId)
        .maybeSingle();
      recipient = res?.data?.email ?? null;
      bookingId = res?.data?.id ?? null;
    } else {
      const res: any = await supabaseAdmin
        .from("contact_messages")
        .select("id, email")
        .eq("id", data.targetId)
        .maybeSingle();
      recipient = res?.data?.email ?? null;
    }

    if (!recipient) throw new Error("No email address on record for this recipient");

    const { cannedEmail } = await import("@/lib/email/canned.server");
    const { sendAndLog } = await import("@/lib/notifications.server");

    const mail = cannedEmail({ subject: data.subject, body: data.body });

    const result = await sendAndLog({
      bookingId,
      // Unique per send so repeat sends of the same template are all recorded.
      eventKey: bookingId ? `manual:${data.templateId}:${Date.now()}` : null,
      notificationType: `manual_${data.templateId}`,
      recipientCategory: "customer",
      recipient,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (!result.configured) {
      return { ok: false, configured: false, recipient, message: "Email provider is not configured yet." };
    }
    if (!result.ok) {
      return { ok: false, configured: true, recipient, message: "The email provider rejected this send." };
    }

    if (data.scope === "message") {
      await supabaseAdmin.from("contact_messages").update({ status: "resolved" }).eq("id", data.targetId);
    }

    return { ok: true, configured: true, recipient, message: `Email sent to ${recipient}` };
  });
