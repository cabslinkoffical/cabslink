import { Link } from "@tanstack/react-router";

const ALL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphaBar({ available }: { available: string[] }) {
  const set = new Set(available.map((l) => l.toUpperCase()));
  return (
    <nav aria-label="Browse alphabetically" className="flex flex-wrap gap-1.5">
      {ALL.map((L) => {
        const on = set.has(L);
        return on ? (
          <Link
            key={L}
            to="/areas/a/$letter"
            params={{ letter: L.toLowerCase() }}
            className="grid size-9 place-items-center rounded-lg border border-[var(--navy)]/15 bg-white text-sm font-semibold text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
          >
            {L}
          </Link>
        ) : (
          <span
            key={L}
            aria-disabled
            className="grid size-9 place-items-center rounded-lg border border-dashed border-[var(--navy)]/10 text-sm text-[var(--navy)]/25"
          >
            {L}
          </span>
        );
      })}
    </nav>
  );
}
