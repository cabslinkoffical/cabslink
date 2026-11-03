import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { trackClick } from "@/lib/tracking";

export type FinalCtaProps = {
  /** Headline; defaults to the homepage wording. */
  heading?: ReactNode;
  subtitle?: string;
  /** Primary action label, e.g. "Get a price for Edinburgh Airport". */
  label?: string;
  /** Internal destination (defaults to /book). Ignored when `href` is set. */
  to?: string;
  /** Search params for `to`, e.g. { tour: "slug" }. */
  search?: Record<string, string>;
  /** Same-page anchor such as "#booking" to jump to a prefilled form. */
  href?: string;
  /** Analytics label for the primary action. */
  trackAs?: string;
};

const DEFAULT_SUBTITLE =
  "Book your driver in under two minutes. Fixed price shown before you book, pay by card, cash or bank transfer, 24/7 support — the calm way to travel across the UK.";

/**
 * Site-wide closing CTA rendered once above the footer. Pages pass a
 * contextual heading/action; with no props it renders the homepage wording.
 */
export function FinalCta({
  heading,
  subtitle = DEFAULT_SUBTITLE,
  label = "Get a fixed price",
  to = "/book",
  search,
  href,
  trackAs = "final_cta_quote",
}: FinalCtaProps) {
  const onClick = trackClick("cta_click", { cta: trackAs });
  return (
    <section className="navy-scene cta-pattern border-y border-gold/20">
      <div className="container-x">
        <div className="relative overflow-hidden">
          <div className="relative px-6 py-12 md:px-12 md:py-16">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <h2 className="font-display text-4xl font-bold leading-tight text-navy-foreground md:text-6xl">
                  {heading ?? <>Ready When <span className="text-gold">You Are</span></>}
                </h2>
                <p className="mt-5 max-w-xl leading-relaxed text-navy-foreground/75">
                  {subtitle}
                </p>
              </div>
              <div className="flex flex-col gap-4 lg:col-span-4 lg:items-end">
                <Button asChild variant="slash" className="w-full lg:w-auto">
                  {href ? (
                    <a href={href} onClick={onClick}>
                      {label} <ArrowRight className="size-4" />
                    </a>
                  ) : (
                    <Link to={to} search={search as never} onClick={onClick}>
                      {label} <ArrowRight className="size-4" />
                    </Link>
                  )}
                </Button>
                <a
                  href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                  onClick={trackClick("phone_click", { source: "final_cta" })}
                  className="group inline-flex items-center gap-3 text-navy-foreground transition-colors"
                >
                  <span className="grid size-11 place-items-center rounded-full border border-navy-foreground/25 transition-colors group-hover:border-gold">
                    <Phone className="size-4" />
                  </span>
                  <span className="text-sm">
                    <span className="block text-[10px] uppercase tracking-[0.24em] text-navy-foreground/70">
                      24/7 Reservations
                    </span>
                    <span className="font-semibold">{SITE.phoneUK}</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
