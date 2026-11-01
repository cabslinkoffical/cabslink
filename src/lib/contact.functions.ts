import { getClientIp } from "@/lib/client-ip.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { hitRateLimit, LIMITS } from "@/lib/db-rate-limit.server";
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
// "pending" marks an in-flight insert; a number is the time it was saved.
// Entries only become durable after the row is persisted, so a failed insert
// never makes an identical retry report false success.
export const recentHashes = new Map<string, number | Promise<boolean>>();
const RECENT_TTL_MS = 5 * 60_000;

function hashOf(name: string, email: string, message: string): string {
  return `${email.toLowerCase()}|${name.toLowerCase()}|${message.trim()}`;
}

/**
 * Run `persist` at most once per identical message within the TTL.
 * - Already saved → returns "duplicate" without persisting.
 * - In flight → waits for that attempt; if it succeeded returns "duplicate",
 *   if it failed this caller retries persistence itself.
 * - Failure → the entry is removed and the error propagates.
 */
export async function persistOnce(
  key: string,
  persist: () => Promise<void>,
  now: () => number = Date.now,
): Promise<"saved" | "duplicate"> {
  const t = now();
  for (const [k, v] of recentHashes) if (typeof v === "number" && v + RECENT_TTL_MS <= t) recentHashes.delete(k);
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = recentHashes.get(key);
    if (typeof existing === "number") return "duplicate";
    if (existing) {
      if (await existing) return "duplicate";
      continue; // the in-flight attempt failed — try again ourselves
    }
    let resolve!: (ok: boolean) => void;
    const pending = new Promise<boolean>((r) => { resolve = r; });
    recentHashes.set(key, pending);
    try {
      await persist();
    } catch (err) {
      if (recentHashes.get(key) === pending) recentHashes.delete(key);
      resolve(false);
      throw err;
    }
    recentHashes.set(key, now());
    resolve(true);
    return "saved";
  }
  throw new Error("Could not send. Please try again.");
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof contactInput>) => contactInput.parse(data))
  .handler(async ({ data }) => {
    // Honeypot filled → silently succeed without touching the DB.
    if (data.website && data.website.trim() !== "") return { ok: true };

    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch {}
    if (!(await hitRateLimit(LIMITS.contact, ip))) {
      try { setResponseStatus(429); } catch {}
      throw new Error("You've sent several messages already. Please try again in a few minutes.");
    }

    await assertCaptcha(data.captchaToken, ip, setResponseStatus);

    const key = hashOf(data.name, data.email, data.message);
    const isTour = (data.subject ?? "").toLowerCase().includes("tour");
    const outcome = await persistOnce(key, async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const insert: any = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject || null,
        message: data.message,
        source: isTour ? "tour" : "contact",
        source_page: await (await import("@/lib/message-source.server")).sourcePageFromRequest(),
      };
      if (isTour) insert.tour_status = "new";
      const { error } = await supabaseAdmin.from("contact_messages").insert(insert);
      if (error) {
        console.error("contact insert failed", error);
        throw new Error("Could not send. Please try again.");
      }
    });
    if (outcome === "duplicate") return { ok: true };

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
