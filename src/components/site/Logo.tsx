import { Link } from "@tanstack/react-router";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <span className="grid size-9 place-items-center rounded-lg bg-[var(--gold)] text-[var(--navy)] font-display text-xl font-bold shadow-[var(--shadow-glow)] group-hover:scale-105 transition">
        C
      </span>
      <span className={`font-display text-2xl font-semibold tracking-tight ${light ? "text-[var(--navy-foreground)]" : "text-foreground"}`}>
        Cabs<span className="text-[var(--gold)]">link</span>
      </span>
    </Link>
  );
}
