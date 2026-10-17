import { describe, it, expect } from "vitest";
import {
  wrapSelection, insertBlock, formatHeading,
  extractToc, wordCount, readingMinutes, slugify,
} from "@/lib/blog-markdown";

describe("blog markdown editor operations", () => {
  it("wraps a selection in bold markers and keeps the text selected", () => {
    const v = "Hello world";
    const r = wrapSelection(v, 0, 5, "**", "**");
    expect(r.text).toBe("**Hello** world");
    expect(r.text.slice(r.start, r.end)).toBe("Hello");
  });

  it("inserts the placeholder when nothing is selected", () => {
    const r = wrapSelection("", 0, 0, "*", "*", "italic text");
    expect(r.text).toBe("*italic text*");
    expect(r.text.slice(r.start, r.end)).toBe("italic text");
  });

  it("inserts a block with blank lines around it", () => {
    const r = insertBlock("Intro paragraph", 15, 15, "![Alt](https://example.com/a.jpg)");
    expect(r.text).toBe("Intro paragraph\n\n![Alt](https://example.com/a.jpg)");
  });

  it("does not double the blank lines when one already exists", () => {
    const v = "Intro\n\n";
    const r = insertBlock(v, v.length, v.length, "---");
    expect(r.text).toBe("Intro\n\n---");
  });

  it("toggles an H2 heading on and off on the cursor's line", () => {
    const v = "Some text\nAbout us\nMore text";
    const on = formatHeading(v, 12, 12, 2);
    expect(on.text).toBe("Some text\n## About us\nMore text");
    const off = formatHeading(on.text, on.start, on.start, 2);
    expect(off.text).toBe(v);
  });

  it("replaces an existing H3 with H2 rather than stacking markers", () => {
    const on = formatHeading("### Title", 4, 4, 2);
    expect(on.text).toBe("## Title");
  });

  it("extracts a deduped table of contents from h2/h3 headings only", () => {
    const md = "# Title\n\n## Fares\n\nText\n\n### Fares\n\n## Booking";
    const toc = extractToc(md);
    expect(toc.map((t) => [t.text, t.level])).toEqual([["Fares", 2], ["Fares", 3], ["Booking", 2]]);
    expect(new Set(toc.map((t) => t.id)).size).toBe(3);
  });

  it("counts words and estimates reading time", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("one two three")).toBe(3);
    expect(readingMinutes("word ".repeat(440))).toBe(2);
    expect(readingMinutes("")).toBe(1);
  });

  it("slugifies heading text for stable anchor ids", () => {
    expect(slugify("Edinburgh Airport — fares & times")).toBe("edinburgh-airport-fares-times");
  });
});
