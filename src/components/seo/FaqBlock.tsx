import { FaqAccordion, type FaqAccordionItem } from "@/components/site/FaqAccordion";

export type FaqItem = { q: string; a: string };

/**
 * Thin wrapper kept for existing import sites. All FAQ surfaces render through
 * the shared site-wide FaqAccordion design.
 */
export function FaqBlock({ items, id = "faq" }: { items: FaqItem[]; id?: string }) {
  return <FaqAccordion items={items as FaqAccordionItem[]} id={id} />;
}
