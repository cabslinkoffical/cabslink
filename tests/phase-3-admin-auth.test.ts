import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { isAllowedImageType } from "@/lib/media-types";
import { isHttpsUrl } from "@/lib/dispatch.server";

const read = (p: string) => readFileSync(p, "utf8");

describe("Phase 3 — auth page", () => {
  const src = read("src/routes/auth.tsx");
  it("has no sign-up option", () => {
    expect(src).not.toMatch(/signUp/);
    expect(src).not.toMatch(/Sign up|Create account/);
  });
  it("requires 12-character passwords and renders the captcha on sign in", () => {
    expect(src).toMatch(/MIN_PASSWORD_LENGTH = 12/);
    expect(src).toMatch(/captcha\.widget/);
    expect(src).toMatch(/verifySignInCaptcha/);
  });
});

describe("Phase 3 — admin role re-check", () => {
  it("re-checks every 5 minutes and on focus, signing out when removed", () => {
    const src = read("src/routes/_authenticated/cabs-booking-pannel/route.tsx");
    expect(src).toMatch(/ADMIN_ROLE_RECHECK_MS = 5 \* 60 \* 1000/);
    expect(src).toMatch(/addEventListener\("focus"/);
    expect(src).toMatch(/signOut\(\)/);
  });
});

describe("Phase 3 — audit logs", () => {
  const admin = read("src/lib/admin.functions.ts");
  const bulk = read("src/lib/bulk-actions.functions.ts");
  it("logs role changes, deletes and settings", () => {
    expect(admin).toMatch(/"role_grant" : "role_revoke"/);
    expect(admin).toMatch(/"user_delete"/);
    expect(admin).toMatch(/"settings_update"/);
  });
  it("bulk actions log and count rows actually changed", () => {
    expect(bulk).toMatch(/\.delete\(\)\.in\("id", data\.ids\)\.select\("id"\)/);
    expect(bulk).toMatch(/"bulk_delete"/);
    expect(bulk).toMatch(/"bulk_set_flag"/);
  });
  it("lists every user page", () => {
    expect(admin).toMatch(/for \(let page = 1;/);
  });
});

describe("Phase 3 — dispatch delivery", () => {
  it("only allows https endpoints", () => {
    expect(isHttpsUrl("https://dispatch.example.com/hook")).toBe(true);
    expect(isHttpsUrl("http://dispatch.example.com/hook")).toBe(false);
    expect(isHttpsUrl("not a url")).toBe(false);
  });
  it("claims events, times out and alerts admin on final failure", () => {
    const src = read("src/lib/dispatch.server.ts");
    expect(src).toMatch(/AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/);
    expect(src).toMatch(/REQUEST_TIMEOUT_MS = 10_000/);
    expect(src).toMatch(/status: "sending"/);
    expect(src).toMatch(/notifyDispatchFailure/);
  });
});

describe("Phase 3 — confirmation salt", () => {
  beforeAll(() => {
    vi.stubEnv("BOOKING_TOKEN_SECRET", "x".repeat(40));
  });
  it("legacy (no salt) tokens are unchanged and salt changes the token", async () => {
    const { deriveConfirmationToken } = await import("@/lib/booking-confirmation.server");
    const legacy = deriveConfirmationToken("id-1", "CL-260710-AAAA").token;
    expect(deriveConfirmationToken("id-1", "CL-260710-AAAA", null).token).toBe(legacy);
    const a = deriveConfirmationToken("id-1", "CL-260710-AAAA", "salt-a").token;
    const b = deriveConfirmationToken("id-1", "CL-260710-AAAA", "salt-b").token;
    expect(a).not.toBe(legacy);
    expect(a).not.toBe(b);
  });
});

describe("Phase 3 — safe JSON-LD and media types", () => {
  it("escapes < so a value cannot close the script tag", () => {
    const out = safeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
  it("accepts only jpeg/png/webp/avif", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/avif"]) expect(isAllowedImageType(t)).toBe(true);
    for (const t of ["image/svg+xml", "image/gif", "text/html", null]) expect(isAllowedImageType(t)).toBe(false);
  });
});
