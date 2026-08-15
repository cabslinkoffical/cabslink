/**
 * Cloudflare Turnstile verification (server-only).
 *
 * Behaviour when TURNSTILE_SECRET_KEY is not configured: verification is a
 * no-op so every public form keeps working. Add the secret (and the matching
 * site key) to switch protection on with no further code changes.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function captchaSecret(): string {
  return (process.env["TURNSTILE_SECRET_KEY"] ?? "").trim();
}

export function isCaptchaEnabled(): boolean {
  return captchaSecret().length > 0;
}

export type CaptchaCheck = { ok: boolean; reason?: string };

export async function verifyCaptcha(
  token: string | null | undefined,
  ip?: string,
): Promise<CaptchaCheck> {
  const secret = captchaSecret();
  // Not configured → skip (documented fail-open, see file header).
  if (!secret) return { ok: true };

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
      // Verifier unreachable: do not block genuine customers.
      return { ok: true };
    }
    const json = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (json.success) return { ok: true };
    const codes = json["error-codes"] ?? [];
    console.warn("turnstile rejected", codes);
    // Configuration problems on our side must not block customers.
    if (
      codes.includes("invalid-input-secret") ||
      codes.includes("missing-input-secret") ||
      codes.includes("internal-error")
    ) {
      return { ok: true };
    }
    return { ok: false, reason: codes[0] ?? "failed" };
  } catch (err) {
    console.error("turnstile siteverify failed", err);
    return { ok: true };
  }
}

/**
 * Verifies or throws a customer-friendly error. Sets HTTP 400 when possible.
 */
export async function assertCaptcha(
  token: string | null | undefined,
  ip?: string,
  setStatus?: (code: number) => void,
): Promise<void> {
  const result = await verifyCaptcha(token, ip);
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
