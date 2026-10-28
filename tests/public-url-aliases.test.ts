import { describe, expect, it } from "vitest";
import { PUBLIC_URL_ALIASES } from "@/lib/public-url-aliases";

describe("public compatibility paths", () => {
  it.each([
    ["/privacy-policy", "/privacy"],
    ["/terms-and-conditions", "/terms"],
    ["/cookie-policy", "/cookies"],
    ["/booking-and-cancellation", "/booking-policy"],
    ["/booking", "/book"],
    ["/blog/edinburgh-airport-taxi-cost-2026", "/blog/edinburgh-airport-taxi-cost-2026-price-guide"],
  ])("%s resolves to its verified canonical page", (from, to) => {
    expect(PUBLIC_URL_ALIASES[from]).toBe(to);
    expect(PUBLIC_URL_ALIASES[to]).toBeUndefined();
  });
});