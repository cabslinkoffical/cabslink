import { describe, it, expect } from "vitest";
import {
  hashConfirmationToken,
  isConfirmationTokenShape,
  newConfirmationToken,
} from "@/lib/booking-confirmation.server";

describe("booking confirmation tokens", () => {
  it("issues a 64-char hex token with a matching SHA-256 hash and future expiry", () => {
    const { token, hash, expiresAt } = newConfirmationToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hash).toBe(hashConfirmationToken(token));
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("generates distinct tokens on each call", () => {
    const a = newConfirmationToken().token;
    const b = newConfirmationToken().token;
    expect(a).not.toBe(b);
  });

  it("rejects malformed token shapes without hitting the DB", () => {
    expect(isConfirmationTokenShape("")).toBe(false);
    expect(isConfirmationTokenShape("nope")).toBe(false);
    expect(isConfirmationTokenShape("GG".repeat(32))).toBe(false); // non-hex
    expect(isConfirmationTokenShape("a".repeat(64))).toBe(true);
    expect(isConfirmationTokenShape(123 as any)).toBe(false);
  });
});
