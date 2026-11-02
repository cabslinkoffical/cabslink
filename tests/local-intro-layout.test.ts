import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

// Every local page puts its introduction paragraph and key details beside the
// page photo (the owner's 2 Nov 2026 layout), instead of a full-width photo band.
describe("local page introduction beside the photo", () => {
  it.each([
    "src/components/site/AreaLocationPage.tsx",
    "src/components/site/DestinationPage.tsx",
    "src/components/site/JourneyPage.tsx",
    "src/components/site/ServiceLocationPage.tsx",
    "src/components/seo/SeoPageRenderer.tsx",
    "src/routes/airports.$iata.tsx",
  ])("%s passes an intro to the shared top section", (file) => {
    const src = read(file);
    const hero = src.slice(src.indexOf("<LocalPageHero"));
    expect(hero.slice(0, hero.indexOf("\n      />"))).toContain("intro={{");
  });

  it("the intro renders the paragraph and details before the photo", () => {
    const src = read("src/components/site/LocalPageHero.tsx");
    const copy = src.indexOf("local-intro-copy");
    const image = src.indexOf("local-intro-image");
    expect(copy).toBeGreaterThan(-1);
    expect(image).toBeGreaterThan(copy);
  });
});
