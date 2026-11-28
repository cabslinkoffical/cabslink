import { expect, it } from "vitest";
import { measuredQuoteFunnel } from "@/lib/quote-funnel";

it("counts one quote journey per measured session and only linked submissions", () => {
  const result = measuredQuoteFunnel([
    { created_at: "2026-11-28T10:00:00Z", name: "quote_start", session_id: "a" },
    { created_at: "2026-11-28T10:01:00Z", name: "quote_start", session_id: "a" },
    { created_at: "2026-11-28T11:00:00Z", name: "hourly_quote_start", session_id: "b" },
    { created_at: "2026-11-28T12:00:00Z", name: "quote_start", session_id: null },
  ], [
    { created_at: "2026-11-28T12:00:00Z", name: "booking_submitted", session_id: "a" },
    { created_at: "2026-11-28T12:00:00Z", name: "booking_submitted", session_id: "unrelated" },
  ]);
  expect(result.quotes).toHaveLength(2);
  expect(result.conversion).toBe(50);
});
it("reports missing measurement as unavailable, not a zero conversion rate", () => {
  expect(measuredQuoteFunnel([], []).conversion).toBeNull();
});