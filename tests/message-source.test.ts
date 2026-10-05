import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("every form tags its message with a source", () => {
  it.each([
    ["src/lib/contact.functions.ts", /source: isTour \? "tour" : "contact"/],
    ["src/lib/corporate.functions.ts", /source: "corporate"/],
    ["src/lib/driver-application.functions.ts", /source: "driver"/],
  ])("%s", (file, re) => {
    const src = readFileSync(file, "utf8");
    expect(src).toMatch(re);
    expect(src).toMatch(/source_page:/);
  });
  it("admin inbox shows and filters by source", () => {
    const src = readFileSync("src/routes/_authenticated/cabs-booking-pannel/messages.tsx", "utf8");
    expect(src).toMatch(/SourceBadge/);
    expect(src).toMatch(/setSource/);
  });
});
