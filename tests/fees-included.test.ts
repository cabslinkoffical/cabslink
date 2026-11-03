import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FACT_TEXT } from "@/lib/site-facts";

// Owner rule: road tolls and airport fees are included in the fare.
describe("tolls and airport fees included", () => {
  it("shared wording says both are included", () => {
    expect(FACT_TEXT.feesIncluded).toMatch(/tolls/i);
    expect(FACT_TEXT.feesIncluded).toMatch(/airport/i);
    expect(FACT_TEXT.feesIncludedShort).toBe("Tolls and airport fees included");
  });
  it("terms no longer say tolls or airport fees can be added to the fare", () => {
    const terms = readFileSync("src/routes/terms.tsx", "utf8");
    expect(terms).not.toMatch(/may adjust[^.]*(tolls|airport fees)/i);
  });
  it("refund policy does not list tolls or airport fees as extra charges", () => {
    const refund = readFileSync("src/routes/refund-policy.tsx", "utf8");
    expect(refund).not.toMatch(/tolls, airport fees/i);
  });
});
