/**
 * Client IP for rate limiting / captcha (server-only).
 *
 * Order: `cf-connecting-ip` (set by Cloudflare, not spoofable through the
 * edge), then the LAST `x-forwarded-for` hop (the one appended by our own
 * proxy — earlier hops are client-controlled). Falls back to "unknown".
 */
export function clientIpFromHeaders(headers: Headers | null | undefined): string {
  if (!headers) return "unknown";
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "unknown";
}

/** IP of the current server-function request. */
export async function getClientIp(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    return clientIpFromHeaders(getRequest()?.headers);
  } catch {
    return "unknown";
  }
}
