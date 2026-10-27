/** Headers for responses handled by the application (hosting assets may bypass it). */
export const HSTS = "max-age=31536000; includeSubDomains; preload";
const STATIC_FILE = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/i;

export function canonicalRequestUrl(request: Request): string | undefined {
  const url = new URL(request.url);
  const original = url.toString();
  if (url.hostname === "www.cabslink.com" || url.hostname === "cabslink.com") {
    url.hostname = "cabslink.com";
    url.protocol = "https:";
  }
  const p = url.pathname;
  if ((request.method === "GET" || request.method === "HEAD") &&
      !/^\/(?:_|@)/.test(p) && !/^\/(?:api|node_modules|src|assets)(?:\/|$)/.test(p) && !p.includes(".")) {
    const sensitive = /^\/(booking|manage-booking|track-booking|cabs-booking-pannel|auth)(\/|$)/.test(p);
    const clean = sensitive ? p : p.toLowerCase();
    url.pathname = clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  }
  return url.toString() === original ? undefined : url.toString();
}

export function applyResponsePolicy(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", HSTS);
  const path = new URL(request.url).pathname;
  if ((headers.get("content-type") ?? "").includes("text/html")) {
    headers.set("cache-control", "no-cache, no-store, must-revalidate");
    headers.set("pragma", "no-cache");
    headers.set("expires", "0");
  } else if ((request.method === "GET" || request.method === "HEAD") && response.status === 200 &&
      STATIC_FILE.test(path) && !/^\/(?:api|__l5e)(?:\/|$)/.test(path) &&
      !headers.has("set-cookie") && !request.headers.has("authorization")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}