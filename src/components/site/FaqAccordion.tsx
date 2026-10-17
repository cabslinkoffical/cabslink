import { useState } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * The single site-wide FAQ design (matches the homepage): a numbered list with
 * gold mono numerals, display-font questions and a circular gold plus/minus
 * toggle. Answers stay in the DOM when collapsed (grid-rows animation) so the
 * text remains crawlable and SEO-safe.
 *
 * Every FAQ surface on the site must render through this component — do not
 * build page-specific FAQ lists.
 */
export type FaqAccordionItem = { q: string; a: string };

export function FaqAccordion({
  items,
  id,
  defaultOpen = 0,
  className,
}: {
  items: FaqAccordionItem[];
  /** Optional id for the list container (e.g. anchor targets). */
  id?: string;
  /** Index of the item open on first render; null for all closed. */
  defaultOpen?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  if (!items.length) return null;
  return (
    <div
      id={id}
      className={`divide-y divide-[var(--navy)]/10 border-y border-[var(--navy)]/10 ${className ?? ""}`}
    >
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              aria-expanded={isOpen}
              aria-controls={`${id ?? "faq"}-answer-${i}`}
            >
              <span className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-xs text-[var(--gold-ink)] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-base md:text-lg font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)] transition-colors">
                  {f.q}
                </span>
              </span>
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full border transition-all ${
                  isOpen
                    ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--gold-foreground)] rotate-0"
                    : "border-[var(--navy)]/20 text-[var(--navy)]"
                }`}
              >
                {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </span>
            </button>
            <div
              id={`${id ?? "faq"}-answer-${i}`}
              className="grid transition-[grid-template-rows] duration-300"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="pb-6 pl-10 pr-14 text-sm text-[var(--navy)]/70 leading-relaxed">
                  {f.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
