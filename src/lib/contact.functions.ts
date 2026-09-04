import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { assertCaptcha } from "@/lib/captcha.server";

const contactInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).nullable().optional(),
  subject: z.string().trim().max(150).nullable().optional(),
  message: z.string().trim().min(10).max(1500),
  /** Honeypot — must be empty. If filled we accept and drop silently. */
  website: z.string().trim().max(500).optional().default(""),
  /** Cloudflare Turnstile token; required only when captcha is configured. */
  captchaToken: z.string().trim().max(4096).optional().nullable(),
});

// Short recent-dup cache so a rapid double-submit of the same message is
// idempotent from the caller's perspective without creating two rows.
const recentHashes = new Map<string, number>();
const RECENT_TTL_MS = 5 * 60_000;

function hashOf(name: string, email: string, message: string): string {
  return `${email.toLowerCase()}|${name.toLowerCase()}|${message.trim()}`;
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof contactInput>) => contactInput.parse(data))
  .handler(async ({ data }) => {
    // Honeypot filled → silently succeed without touching the DB.
    if (data.website && data.website.trim() !== "") return { ok: true };

    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "contact", windowMs: 10 * 60_000, max: 5 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("You've sent several messages already. Please try again in a few minutes.");
    }

    await assertCaptcha(data.captchaToken, ip, setResponseStatus);

    const now = Date.now();
    // Sweep expired
    for (const [k, t] of recentHashes) if (t + RECENT_TTL_MS <= now) recentHashes.delete(k);
    const key = hashOf(data.name, data.email, data.message);
    if (recentHashes.has(key)) return { ok: true };
    recentHashes.set(key, now);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isTour = (data.subject ?? "").toLowerCase().includes("tour");
    const insert: any = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message,
    };
    if (isTour) insert.tour_status = "new";
    const { error } = await supabaseAdmin.from("contact_messages").insert(insert);
    if (error) {
      console.error("contact insert failed", error);
      throw new Error("Could not send. Please try again.");
    }

    const { notifyEnquiry } = await import("@/lib/notifications.server");
    await notifyEnquiry({
      kind: isTour ? "tour" : "contact",
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message,
    });

    return { ok: true };
  });
