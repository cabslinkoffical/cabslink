import { describe, it, expect } from "vitest";
import {
  hashConfirmationToken,
  isConfirmationTokenShape,
  newConfirmationToken,
  deriveConfirmationToken,
} from "@/lib/booking-confirmation.server";

describe("booking confirmation tokens", () => {
  it("issues a 64-char hex random token with a matching SHA-256 hash and future expiry", () => {
    const { token, hash, expiresAt } = newConfirmationToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hash).toBe(hashConfirmationToken(token));
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("random newConfirmationToken generates distinct tokens each call", () => {
    expect(newConfirmationToken().token).not.toBe(newConfirmationToken().token);
  });

  it("rejects malformed token shapes without hitting the DB", () => {
    expect(isConfirmationTokenShape("")).toBe(false);
    expect(isConfirmationTokenShape("nope")).toBe(false);
    expect(isConfirmationTokenShape("GG".repeat(32))).toBe(false);
    expect(isConfirmationTokenShape("a".repeat(64))).toBe(true);
    expect(isConfirmationTokenShape(123 as any)).toBe(false);
  });

  describe("deriveConfirmationToken (deterministic HMAC — recoverable)", () => {
    it("returns the same token for the same (id, ref) pair — enables replay recovery", () => {
      const a = deriveConfirmationToken("booking-1", "CL-260710-AAAA");
      const b = deriveConfirmationToken("booking-1", "CL-260710-AAAA");
      expect(a.token).toBe(b.token);
      expect(a.hash).toBe(b.hash);
      expect(a.token).toMatch(/^[0-9a-f]{64}$/);
      expect(a.hash).toBe(hashConfirmationToken(a.token));
    });

    it("token differs for different booking ids", () => {
      const a = deriveConfirmationToken("booking-1", "CL-260710-AAAA");
      const b = deriveConfirmationToken("booking-2", "CL-260710-AAAA");
      expect(a.token).not.toBe(b.token);
    });

    it("token differs for different booking refs", () => {
      const a = deriveConfirmationToken("booking-1", "CL-260710-AAAA");
      const b = deriveConfirmationToken("booking-1", "CL-260710-BBBB");
      expect(a.token).not.toBe(b.token);
    });

    it("token cannot be trivially predicted from booking id alone (secret required)", () => {
      // Without the secret an attacker cannot compute the token from a UUID.
      // We verify by mutating the secret and confirming the token changes.
      const before = deriveConfirmationToken("id-x", "CL-260710-XXXX").token;
      const original = process.env.BOOKING_TOKEN_SECRET!;
      process.env.BOOKING_TOKEN_SECRET = original + "different";
      const after = deriveConfirmationToken("id-x", "CL-260710-XXXX").token;
      process.env.BOOKING_TOKEN_SECRET = original;
      expect(after).not.toBe(before);
    });

    it("throws when the server secret is missing", () => {
      const original = process.env.BOOKING_TOKEN_SECRET;
      delete process.env.BOOKING_TOKEN_SECRET;
      expect(() => deriveConfirmationToken("id", "REF")).toThrow(/BOOKING_TOKEN_SECRET/);
      process.env.BOOKING_TOKEN_SECRET = original;
    });
  });
});
