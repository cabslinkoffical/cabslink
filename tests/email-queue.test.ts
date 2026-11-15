import { describe, it, expect } from "vitest";
import { afterFailure, queueSkipReason, retryDelayMinutes, QUEUE_BATCH_SIZE } from "@/lib/email-automation";

const ok = { marketing_consent: true, unsubscribed_at: null, suppression_reason: null };
const opts = { lastMarketingAt: null, quietDays: 7, sourceActive: true };

describe("email queue rules", () => {
  it("sends in batches of 50", () => expect(QUEUE_BATCH_SIZE).toBe(50));
  it("retries with growing delay, then fails after 3 attempts", () => {
    expect([1, 2].map(retryDelayMinutes)).toEqual([5, 15]);
    const now = new Date("2026-11-15T10:00:00Z");
    expect(afterFailure(1, now)).toEqual({ status: "pending", nextAttemptAt: "2026-11-15T10:05:00.000Z" });
    expect(afterFailure(3, now).status).toBe("failed");
  });
  it("never sends without consent, when suppressed or unsubscribed", () => {
    expect(queueSkipReason(ok, opts)).toBeNull();
    expect(queueSkipReason({ ...ok, marketing_consent: false }, opts)).toBe("no_consent");
    expect(queueSkipReason({ ...ok, suppression_reason: "bounced" }, opts)).toBe("suppressed_bounced");
    expect(queueSkipReason({ ...ok, unsubscribed_at: "2026-11-01T00:00:00Z" }, opts)).toBe("unsubscribed");
    expect(queueSkipReason(null, opts)).toBe("not_a_customer");
  });
  it("respects quiet days between promotional emails", () => {
    const now = new Date("2026-11-15T10:00:00Z");
    expect(queueSkipReason(ok, { ...opts, lastMarketingAt: "2026-11-12T10:00:00Z" }, now)).toBe("quiet_days");
    expect(queueSkipReason(ok, { ...opts, lastMarketingAt: "2026-11-07T10:00:00Z" }, now)).toBeNull();
  });
});
