/** Drops repeated reviews (same author, date and text) so each one is listed once. */
export function uniqueReviews<T extends { author: string; dateIso?: string | null; excerpt?: string | null }>(reviews: T[]): T[] {
  const seen = new Set<string>();
  return reviews.filter((r) => {
    const key = `${r.author.trim().toLowerCase()}|${r.dateIso ?? ""}|${(r.excerpt ?? "").trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
