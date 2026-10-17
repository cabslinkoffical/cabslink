import { FaqAccordion, type FaqAccordionItem } from "@/components/site/FaqAccordion";

export type FaqItem = { q: string; a: string };

/**
 * Wrapper kept for existing import sites: renders the standard
 * "Frequently asked questions" heading above the shared site-wide
 * FaqAccordion design.
 */
export function FaqBlock({ items, id = "faq" }: { items: FaqItem[]; id?: string }) {
  if (!items.length) return null;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="space-y-4">
      <h2 id={`${id}-heading`} className="font-display text-2xl font-semibold text-[var(--navy)]">
        Frequently asked questions
      </h2>
      <FaqAccordion items={items as FaqAccordionItem[]} />
    </section>
  );
}
