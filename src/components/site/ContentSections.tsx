/**
 * Shared long-form content blocks used by hub and service pages.
 *
 * `LongFormSections` renders editorial prose (h2 + paragraphs) and
 * `FaqSection` renders a plain, crawlable question/answer list. Both keep to
 * the Navy/Gold tokens and add no client-side behaviour, so the copy is fully
 * present in the server-rendered HTML.
 */
export type ContentSection = { title: string; paragraphs: string[] };
export type ContentFaq = { q: string; a: string };

export function LongFormSections({
  sections,
  heading,
}: {
  sections: ContentSection[];
  heading?: string;
}) {
  if (!sections.length) return null;
  return (
    <section className="section-y">
      <div className="container-x">
        {heading && (
          <h2 className="font-display text-2xl font-semibold text-[var(--navy)] md:text-3xl">
            {heading}
          </h2>
        )}
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {sections.map((s) => (
            <article key={s.title} className="max-w-prose">
              <h3 className="font-display text-lg font-semibold text-[var(--navy)]">{s.title}</h3>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-3 text-sm leading-relaxed text-[var(--navy)]/70">
                  {p}
                </p>
              ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({
  faqs,
  heading = "Frequently asked questions",
}: {
  faqs: ContentFaq[];
  heading?: string;
}) {
  if (!faqs.length) return null;
  return (
    <section className="section-y bg-[var(--surface)]">
      <div className="container-x">
        <h2 className="font-display text-2xl font-semibold text-[var(--navy)] md:text-3xl">
          {heading}
        </h2>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised"
            >
              <dt className="font-semibold text-[var(--navy)]">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[var(--navy)]/70">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** FAQPage JSON-LD payload for a route `head()` scripts array. */
export function faqJsonLd(faqs: ContentFaq[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    }),
  };
}
