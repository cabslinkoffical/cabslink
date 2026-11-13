import { isCacheablePageRequest } from "@/lib/html-edge-cache";

/**
 * Public marketing pages (home, services, fleet, tours, locations, routes,
 * airports, blog…) may sit in a shared cache for 5 minutes and be served
 * stale while refreshing. Browsers still revalidate every visit (max-age=0)
 * so a new release is picked up straight away.
 */
export const PUBLIC_HTML_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
export const PRIVATE_HTML_CACHE = "no-cache, no-store, must-revalidate";

/** Only anonymous, query-free 200 pages outside booking/payment/admin/account paths get a shared cache. */
export function publicHtmlCacheable(request: Request, response: Response): boolean {
  return response.status === 200 &&
    isCacheablePageRequest(request) &&
    !response.headers.has("set-cookie") &&
    !/private|no-store/i.test(response.headers.get("cache-control") ?? "") &&
    !/(?:cookie|authorization|\*)/i.test(response.headers.get("vary") ?? "");
}

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
  const isRead = request.method === "GET" || request.method === "HEAD";
  // Duplicate hosting address: send page reads on cabslink.lovable.app to the
  // real domain (same path). API/webhook calls and files are left alone.
  if (url.hostname === "cabslink.lovable.app" && isRead && !/^\/(?:api|_|@)/.test(p)) {
    url.hostname = "cabslink.com";
    url.protocol = "https:";
    url.port = "";
  }
  // Duplicate homepage aliases (/index, /index.html, /index/) → the real homepage.
  if (isRead && /^\/index(?:\.html?)?\/*$/i.test(p)) {
    url.pathname = "/";
    url.search = "";
    return url.toString();
  }
  // Unfilled route templates such as /blog/category/$slug (or its encoded
  // form %24slug) were once linked by mistake; send them to the section hub.
  const appPage = !/^\/(?:_|@)/.test(p) && !/^\/(?:api|node_modules|src|assets)(?:\/|$)/.test(p) && !p.includes(".");
  if (isRead && appPage && /\/(?:\$|%24)[a-z_]/i.test(p)) {
    const first = p.split("/").filter(Boolean)[0] ?? "";
    url.pathname = first && !/^(?:\$|%24)/i.test(first) ? `/${first.toLowerCase()}` : "/";
    url.search = "";
    return url.toString();
  }
  if (isRead && appPage) {
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
    if (publicHtmlCacheable(request, response)) {
      headers.set("cache-control", PUBLIC_HTML_CACHE);
      headers.delete("pragma");
      headers.delete("expires");
    } else {
      headers.set("cache-control", PRIVATE_HTML_CACHE);
      headers.set("pragma", "no-cache");
      headers.set("expires", "0");
    }
  } else if ((request.method === "GET" || request.method === "HEAD") && response.status === 200 &&
      STATIC_FILE.test(path) && !/^\/(?:api|__l5e)(?:\/|$)/.test(path) &&
      !headers.has("set-cookie") && !request.headers.has("authorization")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}