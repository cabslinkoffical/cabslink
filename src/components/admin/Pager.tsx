import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, pageCount, clampPage } from "@/lib/admin-paging";
import { cn } from "@/lib/utils";

/**
 * Page controls shown under every staff console list: range summary, page
 * numbers, previous/next and rows-per-page.
 */
export function Pager({
  page, pageSize, total, onPageChange, onPageSizeChange, loading, className, noun = "records",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  className?: string;
  noun?: string;
}) {
  const pages = pageCount(total, pageSize);
  const current = Math.min(Math.max(1, page), pages);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(total, current * pageSize);

  // A delete or a narrower filter can leave the requested page past the end:
  // once the real total is known, move to the last page that exists.
  useEffect(() => {
    if (!loading && page > pages) onPageChange(pages);
  }, [loading, page, pages]); // eslint-disable-line react-hooks/exhaustive-deps

  const numbers = useMemo(() => {
    const out: (number | "gap")[] = [];
    const add = (n: number) => { if (!out.includes(n)) out.push(n); };
    add(1);
    for (let n = current - 1; n <= current + 1; n++) if (n > 1 && n < pages) add(n);
    if (pages > 1) add(pages);
    const withGaps: (number | "gap")[] = [];
    out.sort((a, b) => (a as number) - (b as number)).forEach((n, i, arr) => {
      if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) withGaps.push("gap");
      withGaps.push(n);
    });
    return withGaps;
  }, [current, pages]);

  return (
    <nav
      aria-label="Pages"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        loading && "opacity-70",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {total === 0 ? `No ${noun}` : <>Showing <strong className="text-foreground">{first}–{last}</strong> of <strong className="text-foreground">{total}</strong> {noun}</>}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="First page" disabled={current <= 1 || loading} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Previous page" disabled={current <= 1 || loading} onClick={() => onPageChange(current - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        {numbers.map((n, i) =>
          n === "gap" ? (
            <span key={`g${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={n === current ? "default" : "ghost"}
              className="h-8 min-w-8 px-2 tabular-nums"
              aria-current={n === current ? "page" : undefined}
              disabled={loading}
              onClick={() => onPageChange(n)}
            >
              {n}
            </Button>
          ),
        )}
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Next page" disabled={current >= pages || loading} onClick={() => onPageChange(current + 1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Last page" disabled={current >= pages || loading} onClick={() => onPageChange(pages)}>
          <ChevronsRight className="size-4" />
        </Button>
        {onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="ml-1 h-8 w-[110px] text-xs" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s} per page</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </nav>
  );
}

/**
 * For short settings lists already held in memory (vehicle classes, extras,
 * coupons…): shows them one page at a time with the same controls.
 * Resets to page 1 when the list's filter changes.
 */
export function usePagedRows<T>(rows: T[], resetKey: unknown = "") {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  useEffect(() => { setPage(1); }, [resetKey]);
  const { from, to } = clampPage(Math.min(page, pageCount(rows.length, pageSize)), pageSize);
  return {
    pageRows: rows.slice(from, to + 1),
    pager: {
      page: Math.min(page, pageCount(rows.length, pageSize)),
      pageSize,
      total: rows.length,
      onPageChange: setPage,
      onPageSizeChange: (s: number) => { setPageSize(s); setPage(1); },
    },
  };
}

/** Value that settles `ms` after the last change (for search boxes). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Page number + size state that returns to page 1 whenever `resetKey` changes. */
export function usePageState(resetKey: unknown) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const key = JSON.stringify(resetKey ?? "");
  useEffect(() => { setPage(1); }, [key]);
  return { page, pageSize, setPage, setPageSize: (n: number) => { setPageSize(n); setPage(1); } };
}
