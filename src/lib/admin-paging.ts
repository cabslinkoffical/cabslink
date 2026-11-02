import { z } from "zod";

/**
 * Shared page-by-page loading for staff console lists. Browser-safe: used by
 * server list functions (input validation, range maths) and by the Pager UI.
 */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };

/** Input fields every paged list accepts. Out-of-range values are clamped, never rejected. */
export const pageInputSchema = z.object({
  page: z.coerce.number().int().catch(1).default(1),
  pageSize: z.coerce.number().int().catch(DEFAULT_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  q: z.string().max(200).catch("").default(""),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export function clampPage(page: number | undefined, pageSize: number | undefined) {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize) || DEFAULT_PAGE_SIZE)));
  const p = Math.max(1, Math.floor(Number(page) || 1));
  return { page: p, pageSize: size, from: (p - 1) * size, to: p * size - 1 };
}

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

/**
 * Makes free text safe to embed in a PostgREST `or=(...)` / ilike filter:
 * removes filter-syntax characters and wildcards so a search can't change the
 * query's shape.
 */
export function sanitizeSearch(q: string | undefined | null) {
  return String(q ?? "")
    .replace(/[,()*%\\:"'.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** `col.ilike.*term*` clauses joined for `.or()`, or null when there's no search. */
export function ilikeAny(columns: string[], q: string | undefined | null) {
  const term = sanitizeSearch(q);
  if (!term) return null;
  return columns.map((c) => `${c}.ilike.*${term}*`).join(",");
}

/** Run a PostgREST query built with `{ count: "exact" }` for one page and return a Paged result. */
export async function runPaged<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any; count: number | null }>,
  input: { page?: number; pageSize?: number },
): Promise<Paged<T>> {
  const { page, pageSize, from, to } = clampPage(input.page, input.pageSize);
  const { data, error, count } = await build(from, to);
  if (error) throw new Error(error.message ?? "Could not load this list");
  return { rows: data ?? [], total: count ?? 0, page, pageSize };
}

/** Slice an already-computed array (e.g. aggregated rows) into one page. */
export function slicePage<T>(all: T[], input: { page?: number; pageSize?: number }): Paged<T> {
  const { page, pageSize, from, to } = clampPage(input.page, input.pageSize);
  return { rows: all.slice(from, to + 1), total: all.length, page, pageSize };
}
