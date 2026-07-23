import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
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
    <div ref={boxRef} className="relative w-full max-w-2xl">
      <div className="flex items-center gap-3 rounded-full border border-[var(--navy)]/12 bg-white px-5 py-3.5 shadow-[0_20px_60px_-30px_rgba(14,24,44,0.4)] focus-within:border-[var(--gold)]">
        <Search className="size-5 text-[var(--navy)]/50" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[15px] text-[var(--navy)] placeholder:text-[var(--navy)]/40 focus:outline-none"
          aria-label="Search destinations"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="grid size-6 place-items-center rounded-full text-[var(--navy)]/50 hover:text-[var(--navy)]"
            aria-label="Clear"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-auto rounded-2xl border border-[var(--navy)]/10 bg-white p-2 shadow-[0_30px_80px_-30px_rgba(14,24,44,0.45)]">
          {loading && <div className="p-4 text-sm text-[var(--navy)]/60">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="p-4 text-sm text-[var(--navy)]/60">No matches. Try a town, airport code or route.</div>
          )}
          {!loading &&
            grouped.map(([type, items]) => (
              <div key={type} className="mb-1 last:mb-0">
                <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--navy)]/45">
                  {type.replace(/_/g, " ")}
                </div>
                <ul>
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={destinationHref(r)}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-[var(--navy)]/5"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-[var(--navy)]">
                          {r.display_name ?? r.name}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--navy)]/50">
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
