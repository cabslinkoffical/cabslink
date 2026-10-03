import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { destinationHref, searchDestinations, type Destination } from "@/lib/destinations.functions";

type Result = Destination & { href: string; hasPage: boolean };

export function InstantSearch({ placeholder = "Search cities, airports, routes, universities…" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await searchDestinations({ data: { q: term, limit: 12 } });
        if (!cancelled) setResults(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const grouped = useMemo(() => {
    const g = new Map<string, Result[]>();
    for (const r of results) {
      const key = r.type;
      const arr = g.get(key) ?? [];
      arr.push(r);
      g.set(key, arr);
    }
    return [...g.entries()];
  }, [results]);

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex min-h-16 items-center gap-3 border-b border-navy-foreground/30 bg-transparent px-1 focus-within:border-gold">
        <Search className="size-5 text-gold" />
        <input
          suppressHydrationWarning
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-base text-navy-foreground placeholder:text-navy-foreground/45 focus:outline-none"
          aria-label="Search destinations"
        />
        {q && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQ("")}
            className="text-navy-foreground/60 hover:bg-navy-foreground/10 hover:text-navy-foreground"
            aria-label="Clear"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-auto rounded-lg border border-border bg-popover p-2 shadow-raised-hover">
          {loading && <div className="p-4 text-sm text-muted-foreground">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No matches. Try a town, airport code or route.</div>
          )}
          {!loading &&
            grouped.map(([type, items]) => (
              <div key={type} className="mb-1 last:mb-0">
                <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {type.replace(/_/g, " ")}
                </div>
                <ul>
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={destinationHref(r)}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-muted"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">
                          {r.display_name ?? r.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {[r.town, r.region].filter(Boolean).join(", ")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
