import { describe, it, expect } from "vitest";
import { runSeoChecks } from "@/lib/seo-live-checks";
const get = (r: ReturnType<typeof runSeoChecks>, id: string) => {
  const check = r.find((c) => c.id === id);
  if (!check) throw new Error(`Missing check: ${id}`);
  return check;
};
describe("admin SEO live checks", () => {
  it("title over 60 fails", () => expect(get(runSeoChecks({ title: "x".repeat(61), description: "" }), "title").ok).toBe(false));
  it("description over 155 fails", () => expect(get(runSeoChecks({ title: "", description: "x".repeat(156) }), "desc").ok).toBe(false));
  it("flags fixed fare", () => expect(get(runSeoChecks({ title: "Fixed fare taxis", description: "" }), "fare").ok).toBe(false));
  it("flags under 300 words", () => expect(get(runSeoChecks({ title: "", description: "", body: "a b c" }), "words").ok).toBe(false));
  it("flags second H1 in body", () => expect(get(runSeoChecks({ title: "", description: "", h1: "A", body: "# Big" }), "h1-body").ok).toBe(false));
  it("flags an HTML second H1", () => expect(get(runSeoChecks({ title: "", description: "", h1: "A", body: "<h1>Big</h1>" }), "h1-body").ok).toBe(false));
  it("flags a setext second H1", () => expect(get(runSeoChecks({ title: "", description: "", h1: "A", body: "Big\n===" }), "h1-body").ok).toBe(false));
  it("flags unfinished notes in metadata", () => expect(get(runSeoChecks({ title: "TODO owner title", description: "" }), "todo").ok).toBe(false));
  it("does not apply a full-page word target to a short intro", () => expect(runSeoChecks({ title: "", description: "", body: "intro", minWords: 0 }).some(c => c.id === "words")).toBe(false));
  it("applies the tour word target of 600", () => {
    expect(get(runSeoChecks({ title: "", description: "", body: Array(599).fill("word").join(" "), minWords: 600 }), "words").ok).toBe(false);
    expect(get(runSeoChecks({ title: "", description: "", body: Array(600).fill("word").join(" "), minWords: 600 }), "words").ok).toBe(true);
  });
});
