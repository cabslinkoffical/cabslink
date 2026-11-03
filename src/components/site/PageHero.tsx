import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { trackClick } from "@/lib/tracking";

/**
 * Top section for every non-home page, in the homepage's language: flat navy
 * band, shared accessible breadcrumbs, small tracked gold eyebrow, homepage
 * hero title type and the same closing-band buttons (slash CTA + phone).
 * `align="center"` for marketing pages (like the homepage), `"left"` with
 * `width="reading"` for legal pages and articles.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  showCta = true,
  primaryLabel = "Get a fixed price",
  primaryTo = "/book",
  align = "center",
  width = "default",
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  showCta?: boolean;
  primaryLabel?: string;
  primaryTo?: string;
  align?: "center" | "left";
  width?: "default" | "reading";
  children?: ReactNode;
}) {
  const centered = align === "center";
  const crumbs: Crumb[] = (breadcrumbs ?? []).map((c, i) => ({ name: c.label, href: c.to ?? `#crumb-${i}` }));
  return (
    <section className="hero-gradient page-hero text-[var(--navy-foreground)]" data-align={align}>
      <div className={`container-x page-hero-inner ${width === "reading" ? "page-hero-reading" : ""}`}>
        {crumbs.length > 0 && (
          <div className={centered ? "flex justify-center" : ""}>
            <Breadcrumbs items={crumbs} dark />
          </div>
        )}
        {eyebrow && <p className="page-hero-eyebrow">{eyebrow}</p>}
        <h1 className="page-hero-title font-display">{title}</h1>
        {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
        {showCta && (
          <div className={`page-hero-actions ${centered ? "justify-center" : ""}`}>
            <Button asChild variant="slash">
              <Link to={primaryTo} onClick={trackClick("cta_click", { cta: "page_hero_primary" })}>
                {primaryLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              onClick={trackClick("phone_click", { source: "page_hero" })}
              className="page-hero-phone group"
            >
              <span className="page-hero-phone-icon"><Phone className="size-4" /></span>
              <span className="text-left text-sm">
                <span className="block text-[10px] uppercase tracking-[0.24em] text-[var(--navy-foreground)]/70">Call us 24/7</span>
                <span className="font-semibold">{SITE.phoneUK}</span>
              </span>
            </a>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * The one section heading used on every page except the homepage. Matches the
 * homepage's section headings: small tracked eyebrow, 4xl→5xl display title.
 * On light backgrounds gold text uses the darker gold-ink (readable on white);
 * bright gold is kept for navy backgrounds (`dark`).
 */
export function SectionHeader({ eyebrow, title, titleAccent, subtitle, center = false, dark = false, children }: { eyebrow?: string; title: string; titleAccent?: string; subtitle?: string; center?: boolean; dark?: boolean; children?: ReactNode }) {
  const gold = dark ? "text-[var(--gold)]" : "text-[var(--gold-ink)]";
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${gold}`}>{eyebrow}</p>}
      <h2 className={`font-display text-4xl font-semibold leading-[1.05] md:text-5xl ${dark ? "text-[var(--navy-foreground)]" : "text-[var(--navy)]"}`}>
        {title}
        {titleAccent && (
          <>
            {" "}
            <span className={gold}>{titleAccent}</span>
          </>
        )}
      </h2>
      {subtitle && <p className={`mt-4 text-base md:text-lg ${dark ? "text-[var(--navy-foreground)]/75" : "text-muted-foreground"}`}>{subtitle}</p>}
      {children}
    </div>
  );
}
