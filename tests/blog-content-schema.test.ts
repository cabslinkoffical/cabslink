import { describe, expect, it } from "vitest";
import { blogFaqsSchema, blogImageSchema } from "@/lib/blog-content-schema";

describe("blog image compatibility", () => {
  it.each([
    "/__l5e/assets-v1/ee50ee3f-9501-446a-983f-26e2611c1ea7/blog-glasgow-to-edinburgh-best-ways-to-travel.jpg",
    "/tours/glencoe.jpg",
    "https://cabslink.com/images/article.jpg",
  ])("preserves an existing image reference: %s", (value) => {
    expect(blogImageSchema.parse(value)).toBe(value);
  });
  it("normalises blank optional images", () => {
    expect(blogImageSchema.parse("   ")).toBeNull();
    expect(blogImageSchema.parse(null)).toBeNull();
    expect(blogImageSchema.parse(undefined)).toBeUndefined();
  });
  it.each(["not an image URL", "javascript:alert(1)", "//external.test/image.jpg", "/\\external.test/image.jpg"])(
    "rejects invalid or unsafe image reference: %s", (value) => {
      expect(blogImageSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("blog FAQ compatibility", () => {
  it("preserves all legacy questions and answers in the editor format", () => {
    const faqs = [
      { question: "First question?", answer: "First answer." },
      { question: "Second question?", answer: "Second answer." },
    ];
    expect(blogFaqsSchema.parse(faqs)).toEqual([
      { q: "First question?", a: "First answer." },
      { q: "Second question?", a: "Second answer." },
    ]);
  });
  it("keeps current and mixed-format entries without changing text", () => {
    const result = blogFaqsSchema.parse([
      { q: "Current?", a: "Current answer." },
      { question: "Legacy?", answer: "Legacy answer." },
    ]);
    expect(blogFaqsSchema.parse(result)).toEqual(result);
    expect(result[0]).toEqual({ q: "Current?", a: "Current answer." });
    expect(result[1]).toEqual({ q: "Legacy?", a: "Legacy answer." });
  });
  it("does not silently discard malformed FAQ text", () => {
    expect(blogFaqsSchema.safeParse([{ question: "Missing answer?" }]).success).toBe(false);
    expect(blogFaqsSchema.safeParse([{ q: 5, a: "Answer" }]).success).toBe(false);
  });
});