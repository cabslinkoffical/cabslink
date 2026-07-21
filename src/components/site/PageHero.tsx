import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
}) {
  return (
    <section className="hero-gradient text-[var(--navy-foreground)]">
      <div className="container-x py-16 md:py-24">
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-4">{eyebrow}</p>
        )}
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] max-w-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base md:text-lg text-[var(--navy-foreground)]/75">{subtitle}</p>
        )}
        {breadcrumbs && (
          <nav className="mt-8 flex flex-wrap items-center gap-1 text-sm text-[var(--navy-foreground)]/60">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.to ? <Link to={c.to} className="hover:text-[var(--gold)]">{c.label}</Link> : <span className="text-[var(--navy-foreground)]">{c.label}</span>}
                {i < breadcrumbs.length - 1 && <ChevronRight className="size-3.5" />}
              </span>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, titleAccent, subtitle, center = false, children }: { eyebrow?: string; title: string; titleAccent?: string; subtitle?: string; center?: boolean; children?: ReactNode }) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">{eyebrow}</p>}
      <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
        {title}
        {titleAccent && (
          <>
            {" "}
            <span
              className="text-[var(--gold-ink)]"
            >
              {titleAccent}
            </span>
          </>
        )}
      </h2>
      {subtitle && <p className="mt-4 text-base md:text-lg text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}
