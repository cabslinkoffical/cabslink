import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="Cabslink home">
      <span className="relative grid size-10 place-items-center rounded-lg bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)] group-hover:scale-105 transition">
        {/* simple chauffeur-cap / steering monogram */}
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 13c2.5-4 6-6 9-6s6.5 2 9 6" />
          <path d="M3 13h18l-1.5 4.5a2 2 0 0 1-1.9 1.5H6.4a2 2 0 0 1-1.9-1.5L3 13Z" />
          <circle cx="8.5" cy="16.5" r="1" fill="currentColor" />
          <circle cx="15.5" cy="16.5" r="1" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-none">
        Cabs<span className="text-[var(--gold)]">link</span>
      </span>
    </Link>
  );
}
