import { createServerFn } from "@tanstack/react-start";

/**
 * Public (referrer-restricted) Maps JavaScript API key for the browser.
 *
 * The site runs on cabslink.com, so the Lovable-managed browser key (restricted
 * to *.lovable.app) cannot render maps there. The custom Google Maps connection
 * supplies GOOGLE_MAPS_BROWSER_KEY_1, which the account owner restricts to the
 * cabslink.com referrers. Browser keys are designed to be public, so returning
 * it to the client is safe; the private server key never leaves the server.
 */
export const getMapsBrowserKey = createServerFn({ method: "GET" }).handler(async () => {
  const key =
    process.env["GOOGLE_MAPS_PUBLIC_BROWSER_KEY"] ??
    process.env["GOOGLE_MAPS_BROWSER_KEY_1"] ??
    process.env["GOOGLE_MAPS_BROWSER_KEY"] ??
    "";
  const channel = process.env["GOOGLE_MAPS_TRACKING_ID"] ?? "";
  return { key, channel };
});
