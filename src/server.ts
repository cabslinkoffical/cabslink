import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { serveWithEdgeCache } from "./lib/html-edge-cache";
import { applyResponsePolicy, canonicalRequestUrl } from "./lib/response-policy";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Baseline security response headers.
 *
 * Deliberately omitted: X-Frame-Options / frame-ancestors (the Lovable editor
 * renders the app inside an iframe) and a full Content-Security-Policy, which
 * would need an allowlist for Google Maps, Turnstile and analytics.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  // `payment` must stay allowed for us and Stripe, or card checkout is blocked.
  "permissions-policy":
    'camera=(), microphone=(), usb=(), payment=(self "https://js.stripe.com" "https://checkout.stripe.com")',
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
};

/**
 * HTML documents must never be cached by the browser: a long-lived profile
 * otherwise keeps replaying an old document that references deleted hashed
 * assets, which shows up as "my changes never load" plus chunk load errors.
 * Hashed assets keep their own immutable caching.
 */
function withHtmlRevalidation(response: Response): Response {
  try {
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
      response.headers.set("cache-control", "no-cache, no-store, must-revalidate");
      response.headers.set("pragma", "no-cache");
      response.headers.set("expires", "0");
    }
  } catch {
    /* immutable headers — safe to skip */
  }
  return response;
}

function withSecurityHeaders(response: Response): Response {
  // Streamed SSR bodies must not be re-read; mutate headers in place instead.
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!response.headers.has(name)) response.headers.set(name, value);
    }
  } catch {
    /* immutable headers (e.g. redirects from caches) — safe to skip */
  }
  return response;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const canonical = canonicalRequestUrl(request);
      if (canonical) return applyResponsePolicy(request, withSecurityHeaders(Response.redirect(canonical, 301)));
      const handler = await getServerEntry();
      const response = await serveWithEdgeCache(request, ctx as any, async () =>
        normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx)),
      );
      return applyResponsePolicy(request, withHtmlRevalidation(withSecurityHeaders(response)));
    } catch (error) {
      console.error(error);
      return applyResponsePolicy(request, withSecurityHeaders(new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      })));
    }
  },
};
