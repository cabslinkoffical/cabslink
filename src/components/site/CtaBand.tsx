import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

/**
 * Compact mid-page call-to-action band.
 * Use between content sections to keep "Book now" always within reach.
 */
export function CtaBand({
  eyebrow = "Ready to travel",
  title = "Book your journey in under two minutes",
  subtitle = "Fixed pricing, instant confirmation and 24/7 UK support.",
  primaryLabel = "Book now",
  primaryTo = "/book",
  secondaryLabel,
  secondaryTo,
  tone = "navy",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  tone?: "navy" | "light";
}) {
  const dark = tone === "navy";
  return (
    <section className={dark ? "bg-[var(--navy)]" : "bg-[var(--surface-2)]"}>
      <div className="container-x py-10 md:py-12">
        <div
          className={`flex flex-col gap-6 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between md:p-8 ${
            dark
              ? "border-[var(--gold)]/25 bg-white/[0.04]"
              : "border-border bg-card shadow-raised"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">{eyebrow}</p>
            <h2
              className={`mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl ${
                dark ? "text-white" : "text-[var(--navy)]"
              }`}
            >
              {title}
            </h2>
            <p className={`mt-2 text-sm ${dark ? "text-white/70" : "text-muted-foreground"}`}>{subtitle}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button asChild variant="gold" className="rounded-full px-6">
              <Link to={primaryTo}>
                {primaryLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
            {secondaryLabel && secondaryTo ? (
              <Button
                asChild
                variant="outline"
                className={`rounded-full px-6 ${
                  dark ? "border-white/30 bg-transparent text-white hover:bg-white/10" : ""
                }`}
              >
                <Link to={secondaryTo}>{secondaryLabel}</Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className={`rounded-full px-6 ${
                  dark ? "border-white/30 bg-transparent text-white hover:bg-white/10" : ""
                }`}
              >
                <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>
                  <Phone className="size-4" /> {SITE.phoneUK}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
