// Server-only helpers for the confirmation-token flow.
//
// Token design (recoverable):
//   token = HMAC_SHA256(BOOKING_TOKEN_SECRET, `${bookingId}:${bookingRef}`)
//   hash  = SHA256(token)                              (stored in DB)
//
// Properties:
//   - unguessable without BOOKING_TOKEN_SECRET
//   - not derivable from bookingId or bookingRef alone
//   - deterministic → an idempotent replay of a booking can re-derive
//     the same token, so a customer whose first response was lost can
//     still receive a working confirmation URL
//   - raw token is never persisted, only its SHA-256 hash
//
// Environment variable: BOOKING_TOKEN_SECRET (server-only, never shipped to browser)

import { createHash, createHmac, randomBytes } from "crypto";

/** Confirmation links are valid for 30 days after issue. */
export const CONFIRMATION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Env-var name required for deterministic token derivation. */
export const BOOKING_TOKEN_SECRET_ENV = "BOOKING_TOKEN_SECRET";

function getSecret(): string {
  const s = process.env[BOOKING_TOKEN_SECRET_ENV];
  if (!s || s.length < 32) {
    throw new Error(
      "Server configuration error: BOOKING_TOKEN_SECRET is not set. Confirmation links cannot be issued.",
    );
  }
  return s;
}

export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(String(token ?? "")).digest("hex");
}

/** Loose format check for confirmation tokens (no DB round-trip on malformed input). */
export function isConfirmationTokenShape(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{64}$/i.test(v);
}

/**
 * Deterministic HMAC-based token. Given a stable (bookingId, bookingRef)
 * pair and the server secret, this returns the same token on every call —
 * enabling recoverable confirmation access after a lost first response.
 */
export function deriveConfirmationToken(bookingId: string, bookingRef: string): {
  token: string;
  hash: string;
  expiresAt: string;
} {
  const secret = getSecret();
  const token = createHmac("sha256", secret)
    .update(`${String(bookingId)}:${String(bookingRef)}`)
    .digest("hex"); // 64 hex chars
  return {
    token,
    hash: hashConfirmationToken(token),
    expiresAt: new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS).toISOString(),
  };
}

/**
 * Legacy random token — kept for tests that expect entropy per call.
 * New booking flow uses `deriveConfirmationToken` for recoverability.
 */
export function newConfirmationToken(): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: hashConfirmationToken(token),
    expiresAt: new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS).toISOString(),
  };
}
