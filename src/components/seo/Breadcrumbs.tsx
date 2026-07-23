import { Link } from "@tanstack/react-router";

export type Crumb = { name: string; href: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--navy)]/70">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-[var(--navy)]/30">/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className="font-medium text-[var(--navy)]">
                {c.name}
              </span>
            ) : (
              <Link to={c.href} className="hover:text-[var(--navy)] underline-offset-2 hover:underline">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
