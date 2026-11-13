import { describe, it, expect } from "vitest";
import { runSeoChecks } from "@/lib/seo-live-checks";
const get = (r: ReturnType<typeof runSeoChecks>, id: string) => r.find((c) => c.id === id)!;
describe("admin SEO live checks", () => {
  it("title over 60 fails", () => expect(get(runSeoChecks({ title: "x".repeat(61), description: "" }), "title").ok).toBe(false));
  it("description over 155 fails", () => expect(get(runSeoChecks({ title: "", description: "x".repeat(156) }), "desc").ok).toBe(false));
  it("flags fixed fare", () => expect(get(runSeoChecks({ title: "Fixed fare taxis", description: "" }), "fare").ok).toBe(false));
  it("flags under 300 words", () => expect(get(runSeoChecks({ title: "", description: "", body: "a b c" }), "words").ok).toBe(false));
  it("flags second H1 in body", () => expect(get(runSeoChecks({ title: "", description: "", h1: "A", body: "# Big" }), "h1-body").ok).toBe(false));
});
