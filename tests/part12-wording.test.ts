import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { uniqueReviews } from "@/lib/unique-reviews";

const read = (f: string) => readFileSync(f, "utf8");

describe("untrue wording stays removed", () => {
  it("no Mercedes-only fleet claims on home/About booking steps", () => {
    expect(read("src/routes/index.tsx")).not.toContain("Fixed-fare Mercedes-Benz transfers");
    expect(read("src/lib/booking-steps.ts")).toContain("Pick from our premium fleet");
  });
  it("booking policy has no per-minute waiting rates and states the change rule", () => {
    const s = read("src/routes/booking-policy.tsx");
    expect(s).not.toMatch(/p per minute/);
    expect(s).toContain("waiting time is charged by the hour; the rate depends on the vehicle and is shown when you book.");
    expect(s).toContain("up to 6 hours before pickup with no admin fee. If the new journey costs more or less, we show you the new price before you confirm.");
    expect(s).not.toContain("free of charge up to 6 hours");
  });
  it("no all-in / hidden-surcharge / no-surprises pricing claims", () => {
    for (const f of ["src/routes/index.tsx", "src/routes/services.tsx", "src/components/site/ServicePillarPage.tsx", "src/components/site/AreaLocationPage.tsx"]) {
      expect(read(f), f).not.toMatch(/all-in|No hidden surcharges|no surprises/i);
    }
  });
  it("corporate confirmation time is not promised as 30 minutes", () => {
    expect(read("src/routes/corporate-booking.tsx")).not.toContain("Within 30 minutes, 24/7");
  });
});

describe("home reviews list each review once", () => {
  it("drops an exact repeat of the same review", () => {
    const r = { author: "Ejiroghene Ekokota", dateIso: "2026-10-03", excerpt: "They are precise and on time" };
    const other = { author: "Lee Phillips", dateIso: "2026-10-02", excerpt: "Efficient" };
    expect(uniqueReviews([r, other, { ...r }])).toEqual([r, other]);
  });
});
