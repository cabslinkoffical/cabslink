import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

// Route head()/loader code is bundled into the site's main script. These
// shared modules feed head()/loaders, so they must not pull in page layouts.
const LAYOUTS = ["JourneyPage", "GuidePage", "SeoPageRenderer", "SolutionPage", "ServicePillarPage", "SportsServicePage", "DestinationPage"];

describe("main script stays free of page layouts", () => {
  it("shared SEO/data modules import page tags from .head files, not layouts", () => {
    const files = ["src/lib/hub-config.ts", "src/lib/seo/travel-solutions.ts", "src/lib/seo/service-pillars.ts", "src/lib/seo/auto-seo.ts", "src/lib/seo/content-engine.ts"];
    for (const f of files) {
      const s = readFileSync(f, "utf8");
      for (const l of LAYOUTS) {
        const valueImport = new RegExp(`^import \\{[^}]*\\} from "@/components/(?:site|seo)/${l}";`, "m");
        expect(s, `${f} imports ${l}`).not.toMatch(valueImport);
      }
    }
  });

  it("routes take head helpers from .head modules", () => {
    const helpers = /\b(journeyHead|guideHead|buildSeoHead|solutionSchema|pillarSchema|sportsFaqSchema)\b[^}]*\} from "@\/components\/(?:site|seo)\/[A-Za-z]+";/;
    const bad = readdirSync("src/routes").filter((f) => f.endsWith(".tsx")).filter((f) => helpers.test(readFileSync(`src/routes/${f}`, "utf8")));
    expect(bad).toEqual([]);
  });
});
