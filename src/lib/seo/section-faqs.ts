/** One FAQ shape for CMS editing, visible answers and structured data. */
export type SectionFaq = { question: string; answer: string };

export function sectionFaqs(payload: unknown): SectionFaq[] {
  if (!payload || typeof payload !== "object" || !("items" in payload) || !Array.isArray(payload.items)) return [];
  return payload.items.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [{ question: String(row.question ?? row.q ?? ""), answer: String(row.answer ?? row.a ?? "") }];
  });
}

export function publicSectionFaqs(sections: { section_type: string; structured_payload: unknown }[]): SectionFaq[] {
  return sections.filter(s => s.section_type === "faqs").flatMap(s => sectionFaqs(s.structured_payload))
    .filter(f => f.question.trim() && f.answer.trim());
}