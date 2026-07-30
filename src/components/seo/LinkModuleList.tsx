import { Link } from "@tanstack/react-router";
import type { LinkModule } from "@/lib/internal-links";

export function LinkModuleList({ modules }: { modules: LinkModule[] }) {
  const nonEmpty = modules
    // Drop duplicate hrefs inside a module so links never collide.
    .map((m) => ({
      ...m,
      links: m.links.filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i),
    }))
    .filter((m) => m.links.length > 0);
  if (!nonEmpty.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {nonEmpty.map((mod) => (
        <section key={mod.heading} className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--navy)]/70">
            {mod.heading}
          </h3>
          <ul className="space-y-2">
            {mod.links.map((l) => (
              <li key={l.href}>

                <Link
                  to={l.href}
                  className="block text-[var(--navy)] hover:text-[var(--gold)]"
                >
                  <span className="font-medium">{l.label}</span>
                  {l.sublabel && (
                    <span className="ml-2 text-xs text-[var(--navy)]/60">{l.sublabel}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
