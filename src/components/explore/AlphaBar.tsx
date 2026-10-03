import { Link } from "@tanstack/react-router";

const ALL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphaBar({ available }: { available: string[] }) {
  const set = new Set(available.map((l) => l.toUpperCase()));
  return (
    <nav aria-label="Browse alphabetically" className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-13">
      {ALL.map((L) => {
        const on = set.has(L);
        return on ? (
          <Link
            key={L}
            to="/areas/a/$letter"
            params={{ letter: L.toLowerCase() }}
            className="grid aspect-square place-items-center bg-card text-sm font-semibold text-foreground transition-colors hover:bg-navy hover:text-navy-foreground"
          >
            {L}
          </Link>
        ) : (
          <span
            key={L}
            aria-disabled
            className="grid aspect-square place-items-center bg-surface-2 text-sm text-muted-foreground/40"
          >
            {L}
          </span>
        );
      })}
    </nav>
  );
}
