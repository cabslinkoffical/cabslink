import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { assertCaptcha } from "@/lib/captcha.server";

const input = z.object({
  company: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  needs: z.string().trim().min(10).max(1500),
  website: z.string().trim().max(500).optional().default(""),
  /** Cloudflare Turnstile token; required only when captcha is configured. */
  captchaToken: z.string().trim().max(4096).optional().nullable(),
});

export type CorporateInput = z.infer<typeof input>;

const recent = new Map<string, number>();
const TTL = 5 * 60_000;

/** Pure handler — safe to call directly from tests. */
export async function submitCorporateInquiryImpl(
  data: CorporateInput,
  opts: { ip?: string; setStatus?: (n: number) => void } = {},
): Promise<{ ok: true }> {
  const parsed = input.parse(data);
  if (parsed.website && parsed.website.trim() !== "") return { ok: true };

  const ip = opts.ip ?? "unknown";
  if (!checkLimit({ name: "corporate", windowMs: 10 * 60_000, max: 5 }, ip).ok) {
    try { opts.setStatus?.(429); } catch {}
    throw new Error("Too many submissions. Please try again in a few minutes.");
  }

  const now = Date.now();
  for (const [k, t] of recent) if (t + TTL <= now) recent.delete(k);
  const key = `${parsed.email.toLowerCase()}|${parsed.company.toLowerCase()}|${parsed.needs.trim()}`;
  if (recent.has(key)) return { ok: true };
  recent.set(key, now);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name: `${parsed.name} (${parsed.company})`,
    email: parsed.email,
    phone: parsed.phone,
    subject: "Corporate Account Enquiry",
    message: parsed.needs,
  } as any);
  if (error) {
    console.error("corporate insert failed", error);
    throw new Error("Could not submit. Please try again.");
  }

  const { notifyEnquiry } = await import("@/lib/notifications.server");
  await notifyEnquiry({
    kind: "corporate",
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    subject: "Corporate Account Enquiry",
    message: parsed.needs,
    extra: [{ label: "Company", value: parsed.company }],
  });

  return { ok: true };
}

export const submitCorporateInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: CorporateInput) => input.parse(data))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    await assertCaptcha(data.captchaToken, ip, setResponseStatus);
    return submitCorporateInquiryImpl(data, { ip, setStatus: setResponseStatus });
  });
