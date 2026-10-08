/** Keep the existing A–Z indexing threshold identical in the page and sitemap. */
export const MIN_INDEXABLE_LETTER_COUNT = 8;

export function indexableAlphaPaths(rows: ReadonlyArray<{ name: string }>): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    // getAlphaBucket filters name (not display_name) with an initial-letter ILIKE.
    const letter = row.name[0]?.toLowerCase();
    if (letter && /^[a-z]$/.test(letter)) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count >= MIN_INDEXABLE_LETTER_COUNT)
    .map(([letter]) => `/areas/a/${letter}`).sort();
}