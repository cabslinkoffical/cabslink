import { describe, expect, it } from "vitest";
import { amendmentMoney } from "@/lib/amendment-money";

describe("booking change money", () => {
  it("charges only what is still owed when an earlier refund is open", () => {
    // Paid £49.62, fare cut to £39.62 (refund £10 not yet sent), then raised to £79.24.
    const r = amendmentMoney({ paymentStatus: "paid", delta: 39.62, newPrice: 79.24, balancePence: 7924 - 4962 });
    expect(r).toEqual({ outcome: "topup", amountDue: 29.62, refundDue: 0 });
  });

  it("refunds the overpayment measured against what was paid", () => {
    const r = amendmentMoney({ paymentStatus: "paid", delta: -10, newPrice: 39.62, balancePence: 3962 - 4962 });
    expect(r).toEqual({ outcome: "refund", amountDue: 0, refundDue: 10 });
  });

  it("asks for nothing when earlier payments already cover a higher fare", () => {
    const r = amendmentMoney({ paymentStatus: "paid", delta: 5, newPrice: 49.62, balancePence: 0 });
    expect(r.outcome).toBe("even");
    expect(r.amountDue).toBe(0);
  });

  it("unpaid bookings pay the whole new fare", () => {
    expect(amendmentMoney({ paymentStatus: "unpaid", delta: 10, newPrice: 60, balancePence: null })).toEqual({ outcome: "pay_full", amountDue: 60, refundDue: 0 });
  });

  it("falls back to the fare difference when staff marked it paid without payment records", () => {
    expect(amendmentMoney({ paymentStatus: "paid", delta: 12.5, newPrice: 62.5, balancePence: null })).toEqual({ outcome: "topup", amountDue: 12.5, refundDue: 0 });
  });
});
