import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="relative grid size-10 place-items-center rounded-md bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)] group-hover:scale-105 transition">
        <MapPin className="size-5" strokeWidth={2.5} />
      </span>
      <span className="font-display text-2xl font-bold tracking-tight text-foreground">
        Cabs<span className="text-[var(--gold)]">link</span>
      </span>
    </Link>
  );
}
