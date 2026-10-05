import { createServerFn } from "@tanstack/react-start";
import type { DriverApplicationInput } from "@/lib/driver-application.server";

export type { DriverApplicationInput };

export const submitDriverApplication = createServerFn({ method: "POST" })
  .inputValidator((data: DriverApplicationInput) => data)
  .handler(async ({ data }) => {
    const { input, submitDriverApplicationImpl } = await import("@/lib/driver-application.server");
    const { getClientIp } = await import("@/lib/client-ip.server");
    const { hitRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    const { assertCaptcha } = await import("@/lib/captcha.server");
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    const parsed = input.parse(data) as DriverApplicationInput;
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch {}
    // Rate limit first, so a flood never reaches the captcha verifier.
    if (!(await hitRateLimit(LIMITS.driverApplication, ip))) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many submissions. Please try again in a few minutes.");
    }
    await assertCaptcha(parsed.captchaToken, ip, setResponseStatus);
    return submitDriverApplicationImpl(parsed, { ip, setStatus: setResponseStatus, rateLimited: true });
  });
