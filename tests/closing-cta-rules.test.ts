import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("closing call to action", () => {
  it.each([
    "src/routes/book.index.tsx",
    "src/routes/book.hourly.tsx",
    "src/components/site/DayBookingWizard.tsx",
    "src/routes/booking.$token.tsx",
    "src/routes/manage-booking.tsx",
  ])("booking and payment page %s hides the marketing band", (file) => {
    const layouts = read(file).match(/<SiteLayout\b[^>]*>/g) ?? [];
    expect(layouts.length).toBeGreaterThan(0);
    for (const tag of layouts) expect(tag).toContain("hideCta");
  });

  it("local page action jumps to the prefilled booking form", () => {
    expect(read("src/components/site/LocalPageHero.tsx")).toContain('id="booking"');
    for (const file of [
      "src/components/site/AreaLocationPage.tsx",
      "src/components/site/DestinationPage.tsx",
      "src/components/site/JourneyPage.tsx",
      "src/components/site/ServiceLocationPage.tsx",
      "src/components/seo/SeoPageRenderer.tsx",
    ]) {
      expect(read(file)).toContain('href: "#booking"');
    }
  });

  it("service FAQ sections no longer repeat the booking buttons", () => {
    for (const file of [
      "src/components/site/ServicePillarPage.tsx",
      "src/components/site/SolutionPage.tsx",
      "src/components/site/ServiceLocationPage.tsx",
    ]) {
      expect(read(file)).not.toContain("tel:${SITE.phoneUK");
    }
  });
});
