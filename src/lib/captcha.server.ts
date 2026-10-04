/**
 * Cloudflare Turnstile verification (server-only).
 *
 * Production (live hosts such as cabslink.com) FAILS CLOSED: a missing
 * secret, an unreachable verifier, a non-200 reply or a configuration error
 * all reject the submission. Preview/dev/localhost keep the old lenient
 * behaviour so testing is never blocked. Callers must run their rate limit
 * BEFORE calling this, so a flood never reaches Cloudflare.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function captchaSecret(): string {
  return (process.env["TURNSTILE_SECRET_KEY"] ?? "").trim();
}

export function isCaptchaEnabled(): boolean {
  return captchaSecret().length > 0;
}

export type CaptchaCheck = { ok: boolean; reason?: string };
export type CaptchaOptions = { production?: boolean };

/** Production = the request is served from a live (non-preview) host. */
async function isProductionRequest(): Promise<boolean> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (!req) return false;
    const { resolveStripeEnvForHost, hostFromRequest } = await import("@/lib/stripe-payments.server");
    return resolveStripeEnvForHost(hostFromRequest(req)) === "live";
  } catch {
    return false;
  }
}

export async function verifyCaptcha(
  token: string | null | undefined,
  ip?: string,
  opts: CaptchaOptions = {},
): Promise<CaptchaCheck> {
  const production = opts.production ?? (await isProductionRequest());
  const lenient = (reason: string): CaptchaCheck => (production ? { ok: false, reason } : { ok: true });
  const secret = captchaSecret();
  if (!secret) return lenient("not-configured");

  const t = (token ?? "").trim();
  if (!t) return { ok: false, reason: "missing" };
  if (t.length > 4096) return { ok: false, reason: "malformed" };

  const body = new URLSearchParams({ secret, response: t });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      console.error("turnstile siteverify http", res.status);
      return lenient("verifier-http-" + res.status);
    }
    const json = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (json.success) return { ok: true };
    const codes = json["error-codes"] ?? [];
    console.warn("turnstile rejected", codes);
    // Configuration problems on our side: lenient outside production only.
    if (
      codes.includes("invalid-input-secret") ||
      codes.includes("missing-input-secret") ||
      codes.includes("internal-error")
    ) {
      return lenient(codes[0]!);
    }
    return { ok: false, reason: codes[0] ?? "failed" };
  } catch (err) {
    console.error("turnstile siteverify failed", err);
    return lenient("verifier-unreachable");
  }
}

/**
 * Verifies or throws a customer-friendly error. Sets HTTP 400 when possible.
 */
export async function assertCaptcha(
  token: string | null | undefined,
  ip?: string,
  setStatus?: (code: number) => void,
  opts: CaptchaOptions = {},
): Promise<void> {
  const result = await verifyCaptcha(token, ip, opts);
  if (result.ok) return;
  try {
    setStatus?.(400);
  } catch {
    /* noop */
  }
  throw new Error(
    "We couldn't confirm you're human. Please complete the verification and try again.",
  );
}
