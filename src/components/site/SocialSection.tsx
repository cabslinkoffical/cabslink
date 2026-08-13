import { ArrowUpRight } from "lucide-react";
import { SOCIALS } from "@/lib/social";

/**
 * Site-wide "follow us" band. Contextual copy can be overridden per page.
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
    <section className="section-y navy-scene">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow-gold text-[11px]">{eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold leading-[1.05] text-white">
            {heading}
            <span className="text-[var(--gold)]">{headingAccent}</span>
          </h2>
          <p className="mt-4 leading-relaxed text-white/70">{intro}</p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOCIALS.map(({ key, label, handle, url, blurb, Icon }) => (
            <li key={key}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-[var(--gold)]/60 hover:bg-white/[0.07]"
              >
                <span className="grid size-11 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                  <Icon className="size-5" />
                </span>
                <span className="mt-4 font-display text-lg font-semibold text-white">{label}</span>
                <span className="mt-1 text-xs font-medium tracking-wide text-[var(--gold)]">{handle}</span>
                <span className="mt-3 flex-1 text-sm leading-relaxed text-white/65">{blurb}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 group-hover:text-[var(--gold)]">
                  Follow <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
