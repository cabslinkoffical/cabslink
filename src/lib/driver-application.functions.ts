import { getClientIp } from "@/lib/client-ip.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { hitRateLimit, LIMITS } from "@/lib/db-rate-limit.server";
import { assertCaptcha } from "@/lib/captcha.server";

const s = (max: number) => z.string().trim().max(max).optional().default("");

/** Structured driver details from the detailed application form. */
const details = z.object({
  area: z.string().trim().min(1).max(100),
  rightToWork: z.enum(["yes", "no"]),
  licenceYears: z.coerce.number().int().min(0).max(70),
  phLicence: z.enum(["yes", "applying", "no"]),
  council: s(100),
  phLicenceNumber: s(40),
  phLicenceExpiry: s(20),
  hasVehicle: z.enum(["own", "rent", "none"]),
  vehicleMakeModel: s(100),
  vehicleYear: s(4),
  vehicleReg: s(12),
  vehicleSeats: s(2),
  insurance: z.enum(["yes", "no"]).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60),
  availability: z.enum(["full-time", "part-time", "weekends", "flexible"]),
});

const input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  message: z.string().trim().max(1000).optional().default(""),
  details: details.optional(),
  website: z.string().trim().max(500).optional().default(""),
  /** Cloudflare Turnstile token; required only when captcha is configured. */
  captchaToken: z.string().trim().max(4096).optional().nullable(),
}).superRefine((d, ctx) => {
  // Without structured details the free-text message is the application.
  if (!d.details && d.message.length < 10) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "Message too short" });
  }
});

export type DriverApplicationInput = z.input<typeof input>;

const LABELS: Record<string, string> = {
  yes: "Yes", no: "No", applying: "Applying", own: "Owned", rent: "Rented / financed", none: "No vehicle",
};

/** Readable summary stored as the message so the admin inbox shows everything. */
export function composeDriverMessage(d: z.infer<typeof details> | undefined, notes: string): string {
  if (!d) return notes;
  const lines = [
    `Area covered: ${d.area}`,
    `Right to work in UK: ${LABELS[d.rightToWork]}`,
    `Full UK licence held: ${d.licenceYears} years`,
    `Private hire licence: ${LABELS[d.phLicence]}`,
  ];
  if (d.phLicence !== "no" && d.council) lines.push(`Licensing council: ${d.council}`);
  if (d.phLicence === "yes") lines.push(`Badge / licence no.: ${d.phLicenceNumber}`, `Licence expiry: ${d.phLicenceExpiry}`);
  lines.push(`Vehicle: ${LABELS[d.hasVehicle]}`);
  if (d.hasVehicle !== "none") {
    lines.push(
      `Make / model: ${d.vehicleMakeModel}`,
      `Year: ${d.vehicleYear}`,
      `Registration: ${d.vehicleReg.toUpperCase()}`,
      `Passenger seats: ${d.vehicleSeats}`,
      `Hire & reward insurance: ${d.insurance ? LABELS[d.insurance] : "—"}`,
    );
  }
  lines.push(`Professional driving: ${d.experienceYears} years`, `Availability: ${d.availability}`);
  if (notes) lines.push("", `Notes: ${notes}`);
  return lines.join("\n").slice(0, 3000);
}

const recent = new Map<string, number>();
const TTL = 5 * 60_000;

export async function submitDriverApplicationImpl(
  data: DriverApplicationInput,
  opts: { ip?: string; setStatus?: (n: number) => void; rateLimited?: boolean } = {},
): Promise<{ ok: true }> {
  const parsed0 = input.parse(data);
  const parsed = { ...parsed0, message: composeDriverMessage(parsed0.details, parsed0.message) };
  if (parsed.website && parsed.website.trim() !== "") return { ok: true };

  const ip = opts.ip ?? "unknown";
  if (!opts.rateLimited && !(await hitRateLimit(LIMITS.driverApplication, ip))) {
    try { opts.setStatus?.(429); } catch {}
    throw new Error("Too many submissions. Please try again in a few minutes.");
  }

  const now = Date.now();
  for (const [k, t] of recent) if (t + TTL <= now) recent.delete(k);
  const key = `${parsed.email.toLowerCase()}|${parsed.name.toLowerCase()}|${parsed.message.trim()}`;
  if (recent.has(key)) return { ok: true };
  recent.set(key, now);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    subject: "Driver / Partner Application",
    message: parsed.message,
    source: "driver",
    source_page: await (await import("@/lib/message-source.server")).sourcePageFromRequest(),
  } as any);
  if (error) {
    console.error("driver application insert failed", error);
    throw new Error("Could not submit. Please try again.");
  }

  const { notifyEnquiry } = await import("@/lib/notifications.server");
  await notifyEnquiry({
    kind: "driver",
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    subject: "Driver / Partner Application",
    message: parsed.message,
  });

  return { ok: true };
}

export const submitDriverApplication = createServerFn({ method: "POST" })
  .inputValidator((data: DriverApplicationInput) => input.parse(data))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch {}
    // Rate limit first, so a flood never reaches the captcha verifier.
    if (!(await hitRateLimit(LIMITS.driverApplication, ip))) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many submissions. Please try again in a few minutes.");
    }
    await assertCaptcha(data.captchaToken, ip, setResponseStatus);
    return submitDriverApplicationImpl(data, { ip, setStatus: setResponseStatus, rateLimited: true });
  });
