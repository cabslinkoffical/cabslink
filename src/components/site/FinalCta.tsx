import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

/**
 * Site-wide closing CTA rendered above the footer on every page.
 */
export function FinalCta() {
  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container-x">
        <div className="navy-scene relative overflow-hidden rounded-2xl border border-[var(--gold)]/15 shadow-2xl shadow-[var(--navy)]/25">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #dfaf26 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative px-6 py-12 md:px-12 md:py-16">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--gold)]">
                  Ready when you are
                </p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] text-white md:text-6xl">
                  Ready for your <span className="text-[var(--gold)]">next journey?</span>
                </h2>
                <p className="mt-5 max-w-xl leading-relaxed text-white/75">
                  Book your driver in under two minutes. Fixed pricing, instant confirmation,
                  24/7 support — the calm way to travel across the UK.
                </p>
              </div>
              <div className="flex flex-col gap-4 lg:col-span-4 lg:items-end">
                <Button asChild variant="slash" className="w-full lg:w-auto">
                  <Link to="/book">
                    Get Instant Quote <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <a
                  href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                  className="group inline-flex items-center gap-3 text-white transition-colors"
                >
                  <span className="grid size-11 place-items-center rounded-full border border-white/25 transition-colors group-hover:border-[var(--gold)]">
                    <Phone className="size-4" />
                  </span>
                  <span className="text-sm">
                    <span className="block text-[10px] uppercase tracking-[0.24em] text-white/60">
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
