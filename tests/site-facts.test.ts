import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FACTS, FACT_TEXT } from "@/lib/site-facts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

// Customer-facing page files that must read business rules from FACTS.
const PAGE_FILES = [
  "src/routes/index.tsx",
  "src/routes/airport-transfers.index.tsx",
  "src/routes/about.tsx",
  "src/routes/fleet.tsx",
  "src/routes/booking-policy.tsx",
  "src/routes/tours.$slug.tsx",
  "src/components/site/ServiceLocationPage.tsx",
  "src/components/site/AreaLocationPage.tsx",
  "src/components/site/JourneyPage.tsx",
  "src/components/site/Footer.tsx",
  "src/content/about.ts",
  "src/lib/seo/journeys.ts",
];

const BANNED: { label: string; re: RegExp }[] = [
  { label: "free waiting minutes", re: /\b60 min(ute)?s?( of)? (free|wait)|first 60 minutes|an hour of free|free wait[a-z ]{0,10}60/i },
  { label: "waiting rate", re: /£0\.50|£0\.75|\b50p per minute|\b75p per minute/i },
  { label: "cancellation hours", re: /\b(12|48|24) hours before (pickup|the tour)/i },
  { label: "company number", re: /SC814706/ },
  { label: "US phone", re: /\+1 \(315\)|961-8102/ },
  { label: "fixed seat counts for large vehicles", re: /\b(16|24|55)[- ]seat(er|s)?\b/i },
];

describe("FACTS is the single source of truth", () => {
  it("holds the agreed business facts", () => {
    expect(FACTS.airportWait.freeMinutes).toBe(60);
    expect(FACTS.airportWait.perMinutePence).toBe(50);
    expect(FACTS.airportWait.perMinutePenceLarge).toBe(75);
    expect(FACTS.transferCancellation).toMatchObject({ freeOverHours: 12, halfFromHours: 3 });
    expect(FACTS.tourCancellation).toMatchObject({ freeOverHours: 48, halfFromHours: 24 });
    expect(FACTS.company.companyNumber).toBe("SC814706");
    expect(FACT_TEXT.companyLine).toContain("Cabslink Limited");
  });

  for (const file of PAGE_FILES) {
    it(`${file} does not hardcode FACTS figures`, () => {
      const src = readFileSync(file, "utf8");
      for (const b of BANNED) expect(src, `${file}: ${b.label}`).not.toMatch(b.re);
    });
  }

  it("no US phone number remains anywhere in src", () => {
    for (const f of walk("src")) {
      if (f.includes("integrations/")) continue;
      expect(readFileSync(f, "utf8"), f).not.toMatch(/phoneUS|961-8102/);
    }
  });

  it("VEHICLE_TYPES constant is gone", () => {
    expect(readFileSync("src/lib/site.ts", "utf8")).not.toMatch(/VEHICLE_TYPES/);
  });
});
