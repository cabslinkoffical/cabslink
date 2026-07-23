export type FaqItem = { q: string; a: string };

export function FaqBlock({ items, id = "faq" }: { items: FaqItem[]; id?: string }) {
  if (!items.length) return null;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="space-y-4">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold text-[var(--navy)]">
        Frequently asked questions
      </h2>
      <dl className="divide-y divide-[var(--navy)]/10 rounded-2xl border border-[var(--navy)]/10 bg-white">
        {items.map((it, i) => (
          <details key={i} className="group p-5">
            <summary className="cursor-pointer list-none font-medium text-[var(--navy)]">
              {it.q}
            </summary>
            <dd className="mt-2 text-[var(--navy)]/80">{it.a}</dd>
          </details>
        ))}
      </dl>
    </section>
  );
}
