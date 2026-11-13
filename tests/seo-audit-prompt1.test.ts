import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { refundTierFor } from "@/lib/manage-booking.functions";

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
  it("standard cover uses the current 24-hour refund boundary rather than the retired tour schedule", () => {
    const booking = { allowed: true, paymentStatus: "paid", cover: "standard" as const, withinBookingGrace: false };
    expect(refundTierFor({ ...booking, hoursUntilPickup: 24 })).toBe("full");
    expect(refundTierFor({ ...booking, hoursUntilPickup: 23.99 })).toBe("partial");
  });
  it("labels the existing rules as Transfers", () => {
    expect(t).toMatch(/Transfers — when we refund in full/);
  });
});
