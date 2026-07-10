// Server-only helpers for the confirmation-token flow.

import { createHash, randomBytes } from "crypto";

/** How long a customer's confirmation token is valid, in ms. */
export const CONFIRMATION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Create a new random token + its SHA-256 hex hash. Raw token is only ever
 *  returned to the client that created the booking; only the hash is stored. */
export function newConfirmationToken(): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString("hex"); // 64 hex chars
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS).toISOString();
  return { token, hash, expiresAt };
}

export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(String(token ?? "")).digest("hex");
}

/** Loose format check for confirmation tokens (no DB round-trip on malformed input). */
export function isConfirmationTokenShape(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{64}$/i.test(v);
}
