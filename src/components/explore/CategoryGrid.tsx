import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { CategoryCard } from "@/lib/explore.functions";

export function CategoryGrid({ categories }: { categories: CategoryCard[] }) {
  if (!categories.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.type}
          to={c.hubHref}
          className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--navy)]/10 bg-white px-4 py-3.5 transition hover:border-[var(--gold)]"
        >
          <div>
            <div className="text-sm font-semibold text-[var(--navy)]">{c.label}</div>
            <div className="text-xs text-[var(--navy)]/60">{c.count} destination{c.count === 1 ? "" : "s"}</div>
          </div>
          <ArrowUpRight className="size-4 text-[var(--navy)]/40 transition group-hover:text-[var(--gold-ink)]" />
        </Link>
      ))}
    </div>
  );
}
