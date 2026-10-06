/**
 * Two-sentence answer at the top of a page, built only from real fields, plus
 * a visible "Last updated" date. The `.speakable` class feeds voice/AI answers.
 */
export function DirectAnswer({
  sentences,
  updated,
  className = "",
}: {
  sentences: (string | null | undefined | false)[];
  updated?: string | null;
  className?: string;
}) {
  const text = sentences.filter((s): s is string => !!s && s.trim().length > 0).slice(0, 2);
  if (!text.length) return null;
  const date = updated ? new Date(updated) : null;
  const valid = date && !Number.isNaN(date.getTime());
  return (
    <div className={`speakable rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-5 ${className}`}>
      <p className="text-base leading-relaxed text-[var(--navy)]">{text.join(" ")}</p>
      {valid && (
        <p className="mt-2 text-xs text-[var(--navy)]/60">
          Last updated <time dateTime={date!.toISOString()}>{date!.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
        </p>
      )}
    </div>
  );
}

/** First `n` sentences of a block of text. */
export function firstSentences(text: string | null | undefined, n = 2): string[] {
  if (!text) return [];
  return (text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+/g) ?? [text.trim()]).slice(0, n).map((s) => s.trim());
}
