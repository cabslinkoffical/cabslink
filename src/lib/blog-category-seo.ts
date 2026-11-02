/**
 * Indexing rules for /blog/category/:slug. Shared by the page head and the
 * sitemap so both always agree on which category pages Google should see.
 */

/** A category page needs at least this many published posts to be indexed. */
export const CATEGORY_INDEX_MIN_POSTS = 3;

export function categoryIsIndexable(publishedPosts: number): boolean {
  return publishedPosts >= CATEGORY_INDEX_MIN_POSTS;
}

/** One or two sentence intro shown under the category H1. */
export function categoryIntro(
  cat: { name: string; description: string | null },
  publishedPosts: number,
): string {
  const lead = (cat.description ?? "").trim().replace(/\s*$/, "");
  const count = `${publishedPosts} ${publishedPosts === 1 ? "article" : "articles"} from the Cabslink team in ${cat.name}, newest first.`;
  if (!lead) return count;
  return `${/[.!?]$/.test(lead) ? lead : `${lead}.`} ${count}`;
}
