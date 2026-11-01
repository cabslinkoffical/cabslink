/**
 * Read every row of a query in pages (PostgREST caps each response), so
 * totals, groupings and searches never silently use a truncated subset.
 * The query must use a stable order. Throws on any page error and when the
 * safety limit is reached, rather than returning partial data.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>,
  size = 1000,
  max = 50000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error instanceof Error ? error : new Error((error as any)?.message ?? "Query failed");
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) return out;
  }
  throw new Error("Pagination exceeded its safety limit; refusing to return partial data");
}
