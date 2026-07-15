import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";

const input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  message: z.string().trim().min(10).max(1000),
  website: z.string().trim().max(500).optional().default(""),
});

const recent = new Map<string, number>();
const TTL = 5 * 60_000;

export const submitDriverApplication = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof input>) => input.parse(data))
  .handler(async ({ data }) => {
    if (data.website && data.website.trim() !== "") return { ok: true };

    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "driver_application", windowMs: 10 * 60_000, max: 5 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many submissions. Please try again in a few minutes.");
    }

    const now = Date.now();
    for (const [k, t] of recent) if (t + TTL <= now) recent.delete(k);
    const key = `${data.email.toLowerCase()}|${data.name.toLowerCase()}|${data.message.trim()}`;
    if (recent.has(key)) return { ok: true };
    recent.set(key, now);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: "Driver / Partner Application",
      message: data.message,
    } as any);
    if (error) {
      console.error("driver application insert failed", error);
      throw new Error("Could not submit. Please try again.");
    }
    return { ok: true };
  });
