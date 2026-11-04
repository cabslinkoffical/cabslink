/**
 * Parses owner-supplied service copy written in a tiny outline format:
 *   "## " heading (H2), "### " sub-heading (H3), "- " bullet,
 *   "Q: " / "A: " FAQ pairs (inside a heading whose text ends in "FAQs"),
 *   anything else is a paragraph. Wording is kept exactly as written.
 */
export type CopyBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] };

export type CopySection = { title: string; blocks: CopyBlock[] };
export type CopyFaq = { q: string; a: string };
export type ServiceCopy = { sections: CopySection[]; faqTitle?: string; faqs: CopyFaq[] };

export function parseServiceCopy(raw: string): ServiceCopy {
  const sections: CopySection[] = [];
  const faqs: CopyFaq[] = [];
  let faqTitle: string | undefined;
  let current: CopySection | null = null;
  let inFaq = false;
  let pendingQ: string | null = null;

  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("## ")) {
      const title = line.slice(3).trim();
      inFaq = /FAQs$/.test(title);
      if (inFaq) {
        faqTitle = title;
        current = null;
      } else {
        current = { title, blocks: [] };
        sections.push(current);
      }
      continue;
    }
    if (inFaq) {
      if (line.startsWith("Q: ")) pendingQ = line.slice(3).trim();
      else if (line.startsWith("A: ") && pendingQ) {
        faqs.push({ q: pendingQ, a: line.slice(3).trim() });
        pendingQ = null;
      }
      continue;
    }
    if (!current) continue;
    if (line.startsWith("### ")) current.blocks.push({ kind: "h3", text: line.slice(4).trim() });
    else if (line.startsWith("- ")) {
      const last = current.blocks[current.blocks.length - 1];
      if (last?.kind === "ul") last.items.push(line.slice(2).trim());
      else current.blocks.push({ kind: "ul", items: [line.slice(2).trim()] });
    } else current.blocks.push({ kind: "p", text: line });
  }
  return { sections, faqTitle, faqs };
}

/** Existing FAQs first, then new ones whose question isn't already present. */
export function mergeFaqs(existing: CopyFaq[], extra: CopyFaq[]): CopyFaq[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const seen = new Set(existing.map((f) => norm(f.q)));
  const out = [...existing];
  for (const f of extra) {
    if (seen.has(norm(f.q))) continue;
    seen.add(norm(f.q));
    out.push(f);
  }
  return out;
}
