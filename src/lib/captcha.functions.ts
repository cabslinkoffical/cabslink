import { createServerFn } from "@tanstack/react-start";

/**
 * Publishes the Turnstile site key to the browser. The site key is public by
 * design; the paired secret never leaves the server. Returns null when captcha
 * is not configured, which makes every form render without a challenge.
 */
export const getCaptchaConfig = createServerFn({ method: "GET" }).handler(async () => {
  const siteKey = (process.env["TURNSTILE_SITE_KEY"] ?? "").trim();
  const secretConfigured = (process.env["TURNSTILE_SECRET_KEY"] ?? "").trim().length > 0;
  return { siteKey: siteKey && secretConfigured ? siteKey : null };
});
