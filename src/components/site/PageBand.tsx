/**
 * Shared building blocks for the content below a page's top section.
 *
 * Every non-home page stacks full-width bands directly inside <main>; the
 * band colours (white / warm cream, navy left alone) alternate automatically
 * from styles.css, so templates never pick section backgrounds themselves.
 */
import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/site/PageHero";

export function PageBand({
  id,
  eyebrow,
  title,
  titleAccent,
  subtitle,
  narrow = false,
  ariaLabel,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  titleAccent?: string;
  subtitle?: string;
  /** Reading width (FAQs, prose). */
  narrow?: boolean;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-label={!title ? ariaLabel : undefined} className={`page-band section-y ${className}`}>
      <div className={`container-x ${narrow ? "max-w-4xl" : ""}`}>
        {title && (
          <div className="mb-10">
            <SectionHeader eyebrow={eyebrow} title={title} titleAccent={titleAccent} subtitle={subtitle} />
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export type FactRow = { label: string; value: ReactNode };

/** Two-column key/value table with a navy header line — used for place facts. */
export function FactTable({ caption, rows, itemType }: { caption: string; rows: FactRow[]; itemType?: string }) {
  if (!rows.length) return null;
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-raised"
      {...(itemType ? { itemScope: true, itemType } : {})}
    >
      <table className="w-full text-left text-sm">
        <caption className="bg-[var(--navy)] px-5 py-3.5 text-left font-display text-base font-semibold text-[var(--navy-foreground)]">
          {caption}
        </caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border first:border-t-0 even:bg-[var(--surface-2)]">
              <th scope="row" className="w-2/5 px-5 py-3.5 align-top text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {r.label}
              </th>
              <td className="px-5 py-3.5 align-top font-medium text-[var(--navy)]">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type BandLink = { href: string; label: string; sublabel?: string };

/** Card list of internal links, each with a title, optional detail line and arrow. */
export function LinkCards({ links, columns = 3 }: { links: BandLink[]; columns?: 1 | 2 | 3 }) {
  const unique = links.filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i);
  if (!unique.length) return null;
  const cols = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <ul className={`grid gap-3 ${cols}`}>
      {unique.map((l) => (
        <li key={l.href}>
          <Link
            to={l.href}
            className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-raised transition hover:border-[var(--gold)]"
          >
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)]">{l.label}</span>
              {l.sublabel && <span className="mt-0.5 block text-xs text-muted-foreground">{l.sublabel}</span>}
            </span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-[var(--navy)] transition group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)]">
              <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Small uppercase label above a group of links inside a band. */
export function GroupLabel({ icon: Icon, children }: { icon?: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-[var(--navy)]">
      {Icon && (
        <span className="grid size-8 place-items-center rounded-full bg-[var(--surface-gold)]">
          <Icon className="size-4 text-[var(--gold-ink)]" />
        </span>
      )}
      {children}
    </h3>
  );
}

/**
 * Editorial prose rows: heading (with a gold index) on the left, paragraphs
 * on the right, divided by hairlines — one aligned reading layout for guide
 * and long-form copy.
 */
export function EditorialRows({ items }: { items: { heading: string; paragraphs: ReactNode[] }[] }) {
  if (!items.length) return null;
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((it, i) => (
        <article key={it.heading} className="grid gap-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
          <div>
            <span className="font-mono text-xs font-semibold text-[var(--gold-ink)]">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-[var(--navy)] md:text-2xl">{it.heading}</h3>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-[var(--navy)]/75">
            {it.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
