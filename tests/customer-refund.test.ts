import { describe, expect, it } from "vitest";
import { customerRefund, refundProgressLabel } from "@/lib/customer-refund";

describe("customer refund facts", () => {
  it("does not invent a refund for an unpaid closed request", () => {
    const r = customerRefund({ status: "closed_unpaid" }, []);
    expect(r?.refundedPence).toBe(0);
    if (!r) throw new Error("Missing request");
    expect(refundProgressLabel(r)).toBe("Cancellation request closed");
  });
  it("keeps a pending request pending even after an earlier amendment refund", () => {
    const r = customerRefund({ status: "pending" }, [{ amount: 100, refunded_amount: 10, status: "partial" }]);
    if (!r) throw new Error("Missing request");
    expect(r.refundedPence).toBe(1000);
    expect(refundProgressLabel(r)).toBe("Cancellation request received");
  });
  it("does not call a partly recorded approved refund complete", () => {
    const r = customerRefund({ status: "refunded", refund_amount: 100 }, [{ amount: 100, refunded_amount: 40, status: "partial" }]);
    if (!r) throw new Error("Missing refund");
    expect(refundProgressLabel(r)).toBe("Refund requires follow-up");
  });
  it("totals refunds across payments, without returning card or staff details", () => {
    expect(customerRefund(null, [{ amount: 50, refunded_amount: 50 }, { amount: 25, refunded_amount: 25 }])).toEqual({ status: "recorded", requestedAt: null, updatedAt: null, refundedPence: 7500, approvedPence: null });
  });
});