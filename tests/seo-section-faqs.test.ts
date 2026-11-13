import { describe, expect, it } from "vitest";
import { publicSectionFaqs, sectionFaqs } from "@/lib/seo/section-faqs";

describe("CMS FAQ compatibility", () => {
  it("keeps legacy question and answer text editable", () => {
    expect(sectionFaqs({ items: [{ q: "Where?", a: "At the saved pickup." }] })).toEqual([{ question: "Where?", answer: "At the saved pickup." }]);
  });
  it("includes complete questions from every FAQ section, excluding incomplete ones", () => {
    expect(publicSectionFaqs([
      { section_type: "faqs", structured_payload: { items: [{ question: "First?", answer: "One." }, { question: "Incomplete", answer: " " }] } },
      { section_type: "faqs", structured_payload: { items: [{ question: "Second?", answer: "Two." }] } },
    ])).toEqual([{ question: "First?", answer: "One." }, { question: "Second?", answer: "Two." }]);
  });
});