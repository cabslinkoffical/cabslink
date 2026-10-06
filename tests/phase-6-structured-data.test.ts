import { describe, it, expect } from "vitest";
import { businessGraph, BUSINESS_ID } from "@/lib/seo/business-graph";
import { safeJsonLd } from "@/lib/safe-json-ld";

describe("Phase 6 — business graph", () => {
  const g = JSON.parse(safeJsonLd(businessGraph({ googleBusinessProfileUrl: "https://g.page/x" })));
  const biz = g["@graph"].find((n: any) => n["@id"] === BUSINESS_ID);
  const site = g["@graph"].find((n: any) => n["@type"] === "WebSite");
  it("has required business fields and no rating", () => {
    expect(biz["@type"]).toEqual(["Organization", "TaxiService"]);
    for (const k of ["legalName", "address", "openingHoursSpecification", "areaServed", "sameAs", "telephone"]) expect(biz[k], k).toBeTruthy();
    expect(biz.legalName).toBe("Cabslink Limited");
    expect(biz.sameAs).toContain("https://g.page/x");
    expect(JSON.stringify(g)).not.toMatch(/AggregateRating/);
  });
  it("has WebSite SearchAction", () => {
    expect(site.potentialAction["@type"]).toBe("SearchAction");
  });
});
