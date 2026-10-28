import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { trackClick } from "@/lib/tracking";

/**
 * Site-wide closing CTA rendered above the footer on every page.
 */
export function FinalCta({ subtitle = "Book your driver in under two minutes. Fixed pricing, instant confirmation, 24/7 support — the calm way to travel across the UK." }: { subtitle?: string }) {
  return (
    <section className="navy-scene cta-pattern border-y border-gold/20">
      <div className="container-x">
        <div className="relative overflow-hidden">
          <div className="relative px-6 py-12 md:px-12 md:py-16">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <h2 className="font-display text-4xl font-bold leading-tight text-navy-foreground md:text-6xl">
                  Ready When <span className="text-gold">You Are</span>
                </h2>
                <p className="mt-5 max-w-xl leading-relaxed text-navy-foreground/75">
                  {subtitle}
                </p>
              </div>
              <div className="flex flex-col gap-4 lg:col-span-4 lg:items-end">
                <Button asChild variant="slash" className="w-full lg:w-auto">
                  <Link to="/book" onClick={trackClick("cta_click", { cta: "final_cta_quote" })}>
                    Book Now <ArrowRight className="size-4" />
                  </Link>
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
