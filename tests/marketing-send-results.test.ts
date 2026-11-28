import { afterEach, expect, it, vi } from "vitest";
import { sendBatch } from "@/lib/marketing.server";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const message = { to: "test@example.com", subject: "Test", html: "<p>Test</p>", text: "Test", unsub: "https://cabslink.com/unsubscribe?token=test" };
function setup(body: unknown) {
  vi.stubEnv("LOVABLE_API_KEY", "test-only");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("MARKETING_FROM_ADDRESS", "test@example.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
}
it("only marks a send accepted when Resend returns its message ID", async () => {
  setup({ data: [{ id: "email-1" }] });
  expect(await sendBatch([message])).toEqual([{ ok: true, id: "email-1", error: null }]);
});
it("never reports a missing provider result as sent", async () => {
  setup({ data: [{ id: "email-1" }] });
  const results = await sendBatch([message, message]);
  expect(results[1]?.ok).toBe(false);
  expect(results[1]?.error).toContain("not retried to avoid a duplicate");
});