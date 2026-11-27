import { createServerFn } from "@tanstack/react-start";
import { corporateInput as input, type CorporateInput } from "@/lib/corporate-schema";

export type { CorporateInput };

export const submitCorporateInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: CorporateInput) => input.parse(data))
  .handler(async ({ data }) => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    const { hitRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    const { assertCaptcha } = await import("@/lib/captcha.server");
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch {}
    // Rate limit first, so a flood never reaches the captcha verifier.
    if (!(await hitRateLimit(LIMITS.corporate, ip))) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many submissions. Please try again in a few minutes.");
    }
    await assertCaptcha(data.captchaToken, ip, setResponseStatus);
    const { submitCorporateInquiryImpl } = await import("@/lib/corporate.server");
    return submitCorporateInquiryImpl(data, { ip, setStatus: setResponseStatus, rateLimited: true });
  });
