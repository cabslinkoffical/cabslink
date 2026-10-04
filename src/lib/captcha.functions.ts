import { createServerFn } from "@tanstack/react-start";

/**
 * Publishes the Turnstile site key to the browser. The site key is public by
 * design; the paired secret never leaves the server. Returns null when captcha
 * is not configured, or when the request comes from a preview/dev host: the
 * Turnstile key is only allowlisted for the live domains, so the widget would
 * show "Unable to connect to website" there. The server skips verification on
 * those hosts too (see captcha.server.ts), so forms keep working.
 */
export const getCaptchaConfig = createServerFn({ method: "GET" }).handler(async () => {
  const siteKey = (process.env["TURNSTILE_SITE_KEY"] ?? "").trim();
  const secretConfigured = (process.env["TURNSTILE_SECRET_KEY"] ?? "").trim().length > 0;
  let live = true;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { resolveStripeEnvForHost, hostFromRequest } = await import("@/lib/stripe-payments.server");
    live = resolveStripeEnvForHost(hostFromRequest(getRequest())) === "live";
  } catch { /* default to live */ }
  return { siteKey: siteKey && secretConfigured && live ? siteKey : null };
});
