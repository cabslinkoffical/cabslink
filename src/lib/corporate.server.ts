import { z } from "zod";
import { corporateInput as input } from "@/lib/corporate-schema";

export type CorporateInput = z.infer<typeof input>;

const recent = new Map<string, number>();
const TTL = 5 * 60_000;

/** Pure handler — safe to call directly from tests. */
export async function submitCorporateInquiryImpl(
  data: CorporateInput,
  opts: { ip?: string; setStatus?: (n: number) => void; rateLimited?: boolean } = {},
): Promise<{ ok: true }> {
  const parsed = input.parse(data);
  if (parsed.website && parsed.website.trim() !== "") return { ok: true };

  const ip = opts.ip ?? "unknown";
  const { hitRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
  if (!opts.rateLimited && !(await hitRateLimit(LIMITS.corporate, ip))) {
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
    source: "corporate",
    source_page: await (await import("@/lib/message-source.server")).sourcePageFromRequest(),
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

