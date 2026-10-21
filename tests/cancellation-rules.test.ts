import { describe, it, expect } from "vitest";
import { cancellationDecision } from "@/lib/cancellation-rules";

const base = { previousStatus: "pending", refundAmount: null, bookingPrice: 50, bookingStatus: "confirmed", paymentStatus: "paid" };

describe("cancellation decisions", () => {
  it("approving cancels the booking", () => {
    expect(cancellationDecision({ ...base, nextStatus: "approved" }).cancelBooking).toBe(true);
  });
  it("declining leaves the booking alone", () => {
    expect(cancellationDecision({ ...base, nextStatus: "declined" }).cancelBooking).toBe(false);
  });
  it("refund defaults to the full fare", () => {
    const d = cancellationDecision({ ...base, nextStatus: "refunded" });
    expect(d.refundAmount).toBe(50);
    expect(d.fullRefund).toBe(true);
  });
  it("partial refund is allowed, over-refund is not", () => {
    expect(cancellationDecision({ ...base, nextStatus: "refunded", refundAmount: 20 }).fullRefund).toBe(false);
    expect(cancellationDecision({ ...base, nextStatus: "refunded", refundAmount: 60 }).error).toMatch(/more than the fare/);
  });
  it("unpaid booking cannot be refunded", () => {
    expect(cancellationDecision({ ...base, paymentStatus: "unpaid", nextStatus: "refunded" }).error).toBeTruthy();
  });
  it("closed request cannot reopen", () => {
    expect(cancellationDecision({ ...base, previousStatus: "declined", nextStatus: "pending" }).error).toBeTruthy();
  });
  it("completed journey cannot be cancelled", () => {
    expect(cancellationDecision({ ...base, bookingStatus: "completed", nextStatus: "approved" }).error).toBeTruthy();
  });
});
