import { describe, it, expect } from "vitest";
import { applyTaxTo } from "@/lib/pricing";

describe("applyTaxTo — the single tax rule", () => {
  it("is a no-op at 0% (mileage/hourly totals unchanged)", () => {
    expect(applyTaxTo(123.45, 0, "exclusive")).toEqual({ net: 123.45, tax: 0, gross: 123.45 });
    expect(applyTaxTo(123.45, 0, "inclusive")).toEqual({ net: 123.45, tax: 0, gross: 123.45 });
  });

  it("adds tax on top in exclusive mode", () => {
    const r = applyTaxTo(100, 0.2, "exclusive");
    expect(r).toEqual({ net: 100, tax: 20, gross: 120 });
  });

  it("derives the split without changing the total in inclusive mode", () => {
    const r = applyTaxTo(120, 0.2, "inclusive");
    expect(r.gross).toBe(120);
    expect(r.net).toBe(100);
    expect(r.tax).toBe(20);
  });

  it("never double-taxes: applying inclusive to an exclusive gross is stable", () => {
    const gross = applyTaxTo(80, 0.2, "exclusive").gross;
    const again = applyTaxTo(gross, 0.2, "inclusive");
    expect(again.gross).toBe(gross);
    expect(again.net).toBe(80);
  });

  it("clamps invalid input", () => {
    expect(applyTaxTo(-5, 0.2, "exclusive").gross).toBe(0);
    expect(applyTaxTo(100, 5, "exclusive").gross).toBe(200);
    expect(applyTaxTo(100, Number.NaN, "exclusive").gross).toBe(100);
  });

  it("extras gross-up matches the customer-facing display formula", () => {
    const net = 12.5;
    const rate = 0.2;
    const serverGross = applyTaxTo(net, rate, "exclusive").gross;
    const clientGross = Math.round(net * (1 + rate) * 100) / 100;
    expect(serverGross).toBe(clientGross);
  });
});
