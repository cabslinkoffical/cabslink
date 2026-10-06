import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { vehicleAlt } from "@/lib/vehicle-alt";

const read = (p: string) => readFileSync(p, "utf8");

describe("Phase 10 polish", () => {
  it("builds descriptive vehicle alt text from class and models", () => {
    expect(vehicleAlt("Executive", [{ name: "Mercedes E-Class" }, { name: "BMW 5 Series" }, { name: "X" }]))
      .toBe("Executive class vehicle, such as a Mercedes E-Class or BMW 5 Series");
    expect(vehicleAlt("Saloon", [])).toBe("Saloon class vehicle");
  });

  it("sends /distance and /get-a-quote to /book", () => {
    expect(read("src/routes/distance.tsx")).toMatch(/redirect\(\{ to: "\/book", statusCode: 301/);
    expect(read("src/routes/get-a-quote.tsx")).toMatch(/to: "\/book"/);
    expect(read("src/lib/sitemap-routes.ts")).not.toContain('"/distance"');
  });

  it("every Get a quote link points at /book", () => {
    expect(read("src/components/site/SportsServicePage.tsx")).not.toContain('primaryTo="/contact"');
    expect(read("src/components/seo/SeoPageRenderer.tsx")).not.toContain('to="/contact">Get a quote');
  });

  it("marquee duplicates are hidden from assistive tech", () => {
    const home = read("src/routes/index.tsx");
    expect(home.match(/inert: true/g)?.length).toBe(2);
  });

  it("Trustpilot ratings show their snapshot date", () => {
    expect(read("src/components/site/TrustpilotSection.tsx")).toContain("Snapshot taken {verified}");
    expect(read("src/routes/reviews.tsx")).toContain("as of {verified}");
  });
});
