import { describe, expect, it } from "vitest";
import { cancellationBucket } from "@/lib/admin-lists.functions";

describe("cancellation request queues", () => {
  it("fully refunded paid requests leave the cancellation queue for Refunds", () => {
    expect(cancellationBucket({ status: "refunded", refund_tier: "full" })).toBe("refunds");
  });
  it("partial refunds stay in Closed", () => {
    expect(cancellationBucket({ status: "refunded", refund_tier: "partial" })).toBe("closed");
  });
  it("declined is its own queue, paid or unpaid", () => {
    expect(cancellationBucket({ status: "declined", refund_tier: "unpaid" })).toBe("declined");
    expect(cancellationBucket({ status: "declined", refund_tier: "full" })).toBe("declined");
  });
  it("unpaid finished requests count as cancelled", () => {
    expect(cancellationBucket({ status: "completed", refund_tier: "unpaid" })).toBe("closed");
  });
  it("pending and in review need action", () => {
    expect(cancellationBucket({ status: "in_review", refund_tier: "full" })).toBe("open");
  });
});
