import { afterEach, expect, it, vi } from "vitest";
import { reconcileEmailDelivery } from "@/lib/marketing.server";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("records bounces once and suppresses future queued sends without sending an email", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "test-only");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("MARKETING_FROM_ADDRESS", "test@example.com");
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ last_event: "bounced" }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  const writes: Array<{ table: string; kind: string; value: unknown }> = [];
  const db = { from(table: string) {
    const q: any = {};
    for (const method of ["select", "eq", "not", "gte", "lt", "order", "limit", "in"]) q[method] = () => q;
    for (const method of ["upsert", "update"]) q[method] = (value: unknown) => { writes.push({ table, kind: method, value }); return q; };
    q.then = (resolve: (value: unknown) => void) => resolve({ data: table === "email_queue" ? [{ id: "q1", email: "test@example.com", provider_message_id: "email1" }] : [], error: null });
    return q;
  } };
  await reconcileEmailDelivery(db);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(writes).toContainEqual({ table: "suppression_list", kind: "upsert", value: { email: "test@example.com", reason: "bounced" } });
  expect(writes).toContainEqual({ table: "email_queue", kind: "update", value: { status: "skipped", skip_reason: "suppressed_bounced" } });
  expect(writes.find(w => w.table === "email_events")?.value).toMatchObject({ type: "bounced", provider_event_id: "resend:email1:bounced", queue_id: "q1" });
});