import { describe, expect, it } from "vitest";
import { resolveSearchSnippet } from "@/lib/seo/search-snippets.head";
import type { RouteFareTable } from "@/lib/seo/route-fares.functions";

describe("live snippet fare selection", () => {
  it("uses the cheapest positive fare from the live table", () => {
    const fares: RouteFareTable = { slug: "test", distanceMiles: 10, durationMinutes: 33, currency: "GBP", currencySymbol: "£", taxLabel: "", taxIncluded: false, fares: [
      { classSlug: "a", className: "A", passengers: 4, luggage: 2, price: 60 },
      { classSlug: "b", className: "B", passengers: 4, luggage: 2, price: 42.75 },
    ] };
    expect(resolveSearchSnippet("Taxi {{from_fare}}", fares)).toBe("Taxi from £42.75");
  });
  it("does not invent a price when the live engine is unavailable", () => {
    expect(resolveSearchSnippet("Taxi {{from_fare}}", null)).toBe("Taxi fixed quote");
  });
});