import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { firstSentences } from "@/components/seo/DirectAnswer";

describe("Phase 9 — AI search visibility", () => {
  const robots = readFileSync("public/robots.txt", "utf8");
  it.each(["OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"])(
    "robots.txt allows %s with the same Disallow lines",
    (bot) => {
      const block = robots.split(/\n\n/).find((b) => b.startsWith(`User-agent: ${bot}\n`))!;
      expect(block).toContain("Allow: /");
      for (const d of ["/cabs-booking-pannel", "/api/", "/booking/", "/book?"]) expect(block).toContain(`Disallow: ${d}`);
    },
  );
  it("llms.txt route exists and reads from the database", () => {
    const src = readFileSync("src/routes/llms[.]txt.ts", "utf8");
    expect(src).toContain('createFileRoute("/llms.txt")');
    expect(src).toContain("scenic_route_templates");
  });
  it("direct answers keep at most two sentences", () => {
    expect(firstSentences("One. Two! Three?", 2)).toEqual(["One.", "Two!"]);
  });
  it("TODO tables block publishing", () => {
    expect(readFileSync("src/lib/blog-admin.functions.ts", "utf8")).toMatch(/TODO.*before publishing/);
  });
});
