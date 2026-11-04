import { describe, it, expect } from "vitest";
import { parseServiceCopy, mergeFaqs } from "@/lib/service-copy";
import { SPORTS_SERVICE_COPY } from "@/content/sports-service-copy";

describe("sports service copy", () => {
  it("parses golf copy into sections, H3s, bullets and 8 FAQs", () => {
    const c = parseServiceCopy(SPORTS_SERVICE_COPY["/golf-transfers"]);
    expect(c.sections.map((s) => s.title)[0]).toBe("Golf transfers from Edinburgh and Glasgow airports");
    expect(c.sections).toHaveLength(6);
    expect(c.faqTitle).toBe("Golf transfer FAQs");
    expect(c.faqs).toHaveLength(8);
    expect(c.sections[1].blocks.filter((b) => b.kind === "h3")).toHaveLength(5);
    const inc = c.sections.find((s) => s.title === "What's included")!;
    expect(inc.blocks[0]).toEqual(expect.objectContaining({ kind: "ul" }));
  });
  it("counts FAQs per page", () => {
    const n = (k: keyof typeof SPORTS_SERVICE_COPY) => parseServiceCopy(SPORTS_SERVICE_COPY[k]).faqs.length;
    expect([n("/football-transfers"), n("/stadium-transfers"), n("/team-sports-travel"), n("/vip-sports-hospitality")]).toEqual([7, 6, 6, 6]);
  });
  it("merges FAQs without duplicate questions", () => {
    const out = mergeFaqs([{ q: "Is the price fixed?", a: "old" }], [{ q: "Is the price fixed?", a: "new" }, { q: "Other?", a: "x" }]);
    expect(out).toEqual([{ q: "Is the price fixed?", a: "old" }, { q: "Other?", a: "x" }]);
  });
});
