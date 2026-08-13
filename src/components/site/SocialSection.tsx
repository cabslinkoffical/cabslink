import { ArrowUpRight } from "lucide-react";
import { SOCIALS } from "@/lib/social";

/**
 * Site-wide "follow us" band. Deliberately light-on-white so it reads as its own
 * section and never blends into the navy footer below it.
 */
export function SocialSection({
  eyebrow = "— Follow CabsLink",
  heading = "Travel with us on ",
  headingAccent = "social.",
  intro = "Route notes, fleet updates and the places we drive to most — shared daily across our channels.",
}: {
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  intro?: string;
}) {
  return (
    <section className="relative overflow-hidden border-t border-b border-navy/10 bg-background">
      {/* soft gold wash so the band feels distinct from neighbouring sections */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(60% 90% at 85% 0%, var(--gold) 0%, transparent 70%), radial-gradient(50% 80% at 0% 100%, var(--navy) 0%, transparent 70%)",
        }}
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />

      <div className="container-x relative py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow-gold text-[11px]">{eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold leading-[1.08] text-navy">
              {heading}
              <span className="text-[var(--gold)]">{headingAccent}</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-navy/65">{intro}</p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {SOCIALS.map(({ key, label, handle, url, Icon }) => (
              <li key={key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-full border border-navy/10 bg-card px-4 py-3 shadow-[0_1px_2px_color-mix(in_oklab,var(--navy)_6%,transparent)] transition-all hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_10px_24px_-14px_color-mix(in_oklab,var(--navy)_45%,transparent)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-[var(--gold)] transition-colors group-hover:bg-[var(--gold)] group-hover:text-navy">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-semibold text-navy">{label}</span>
                    <span className="block truncate text-xs font-medium text-navy/55">{handle}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-navy/35 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--gold)]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
