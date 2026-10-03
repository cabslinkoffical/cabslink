import { Link } from "@tanstack/react-router";

export type Crumb = { name: string; href: string };

export function Breadcrumbs({ items, dark = false }: { items: Crumb[]; dark?: boolean }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={dark ? "text-sm text-navy-foreground/60" : "text-sm text-foreground/70"}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 && <span className={dark ? "text-navy-foreground/30" : "text-foreground/30"}>/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className={dark ? "font-medium text-navy-foreground" : "font-medium text-foreground"}>
                {c.name}
              </span>
            ) : (
              <Link to={c.href} className={dark ? "underline-offset-2 hover:text-gold hover:underline" : "underline-offset-2 hover:text-foreground hover:underline"}>
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
