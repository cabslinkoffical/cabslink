import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SIGNIN_LIMIT = { name: "adminSignIn", max: 10, windowSeconds: 15 * 60 };

/**
 * Checks the Turnstile token before the browser attempts an admin sign-in.
 * The rate limit runs first so a flood of attempts never reaches Cloudflare.
 */
export const verifySignInCaptcha = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().max(4096).nullable() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { hitRateLimit } = await import("@/lib/db-rate-limit.server");
    const { getClientIp } = await import("@/lib/client-ip.server");
    const ip = await getClientIp();
    if (!(await hitRateLimit(SIGNIN_LIMIT, ip))) {
      return { ok: false, error: "Too many sign-in attempts. Please wait a few minutes and try again." };
    }
    const { verifyCaptcha } = await import("@/lib/captcha.server");
    const res = await verifyCaptcha(data.token, ip);
    return res.ok
      ? { ok: true }
      : { ok: false, error: "We couldn't confirm you're human. Please complete the verification and try again." };
  });
