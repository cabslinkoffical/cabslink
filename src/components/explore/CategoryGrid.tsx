import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { CategoryCard } from "@/lib/explore.functions";

export function CategoryGrid({ categories }: { categories: CategoryCard[] }) {
  if (!categories.length) return null;
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.type}
          to={c.hubHref}
          className="group flex min-h-28 items-end justify-between gap-4 bg-card px-5 py-5 transition-colors duration-300 hover:bg-surface-gold"
        >
          <div>
            <div className="font-display text-lg font-semibold text-foreground">{c.label}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{c.count} destination{c.count === 1 ? "" : "s"}</div>
          </div>
          <ArrowUpRight className="size-5 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold" />
        </Link>
      ))}
    </div>
  );
}
