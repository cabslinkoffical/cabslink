import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !f.endsWith("routeTree.gen.ts")) out.push(p);
  }
  return out;
}

const SRC = walk("src").map((f) => [f, readFileSync(f, "utf8")] as const);
const read = (f: string) => readFileSync(f, "utf8");

describe("one business entity in structured data", () => {
  it("business-graph.ts is the only file declaring the #business node", () => {
    for (const [f, t] of SRC) {
      if (f === "src/lib/seo/business-graph.ts") continue;
      expect(t, f).not.toMatch(/"@type":\s*"(Organization|LocalBusiness)"/);
      expect(t, f).not.toMatch(/"@type":\s*\[\s*"LocalBusiness"/);
    }
  });
  it("declares no duplicate #localbusiness or #organization ids", () => {
    for (const [f, t] of SRC) {
      expect(t, f).not.toMatch(/#localbusiness/);
      expect(t, f).not.toMatch(/#organization/);
    }
  });
  it("WebSite / SearchAction appears only in business-graph.ts", () => {
    for (const [f, t] of SRC) {
      if (f === "src/lib/seo/business-graph.ts") continue;
      expect(t, f).not.toMatch(/SearchAction/);
    }
  });
  it("auto-seo emits no Speakable node", () => {
    expect(read("src/lib/seo/auto-seo.ts")).not.toMatch(/speakable/i);
  });
});

describe("area page FAQ matches its JSON-LD", () => {
  it("auto-seo and AreaLocationPage share one FAQ builder", () => {
    expect(read("src/lib/seo/auto-seo.ts")).toMatch(/buildAreaFaqs/);
    expect(read("src/components/site/AreaLocationPage.tsx")).toMatch(/buildAreaFaqs/);
    expect(read("src/components/site/AreaLocationPage.tsx")).not.toMatch(/function buildFaqs\(/);
  });
});

describe("refund policy covers tours", () => {
  const t = read("src/routes/refund-policy.tsx");
  it("has a Tours section with the agreed rules", () => {
    expect(t).toMatch(/<h2>4\. Tours<\/h2>/);
    expect(t).toMatch(/TT\.freeOverHours/);
    expect(t).toMatch(/TT\.halfFromHours/);
    expect(t).toMatch(/TT\.halfToHours/);
  });
  it("labels the existing rules as Transfers", () => {
    expect(t).toMatch(/Transfers — when we refund in full/);
  });
});
