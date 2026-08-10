/**
 * Trustpilot proof section.
 *
 * Shows only figures published on the real Cabslink Trustpilot profile, read
 * from `src/lib/trustpilot.ts`, with the read date and a visible link back to
 * the profile. It deliberately renders NO review quotes, names or avatars, and
 * NO Review/AggregateRating structured data — third-party review scores must
 * not be marked up as first-party review data.
 */
import { motion } from "motion/react";
import { Star, ExternalLink } from "lucide-react";
import { TRUSTPILOT, trustpilotVerifiedOnLabel } from "@/lib/trustpilot";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="relative inline-block h-5 w-5 md:h-6 md:w-6"
        >
          <Star className="absolute inset-0 h-full w-full text-[var(--navy)]/15" fill="currentColor" strokeWidth={0} />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${Math.max(0, Math.min(1, rating - (i - 1))) * 100}%` }}
          >
            <Star className="h-full w-[1.25rem] md:w-[1.5rem] text-[var(--gold)]" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      ))}
    </div>
  );
}

export function TrustpilotSection() {
  const t = TRUSTPILOT;
  const verified = trustpilotVerifiedOnLabel(t);

  return (
    <section className="section-y bg-white" aria-labelledby="trustpilot-heading">
      <div className="container-x">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-[560px] text-center"
        >
          <div className="inline-flex rounded-full border border-[var(--navy)]/15 px-4 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">
              Verified Reviews
            </span>
          </div>

          <h2
            id="trustpilot-heading"
            className="mt-6 font-display text-4xl font-bold leading-[1.05] text-[var(--navy)] md:text-5xl"
          >
            Rated <span className="text-[var(--gold-ink)]">{t.ratingLabel}</span> on Trustpilot.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--navy)]/60 md:text-base">
            Every review below is left by a real Cabslink passenger on our independent Trustpilot
            profile — not collected or edited by us.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-5">
          {/* Score card */}
          <div className="md:col-span-2 rounded-2xl border border-[var(--navy)]/10 bg-white p-7 text-center shadow-[0_1px_2px_rgba(14,24,44,0.04)]">
            <div className="font-display text-5xl font-bold text-[var(--navy)]">
              {t.rating.toFixed(1)}
              <span className="text-2xl text-[var(--navy)]/35"> / 5</span>
            </div>
            <div className="mt-3 flex justify-center">
              <Stars rating={t.rating} />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{t.ratingLabel}</p>
            <p className="mt-1 text-xs text-[var(--navy)]/55">
              Based on {t.reviewCount} Trustpilot reviews
            </p>
          </div>

          {/* Distribution */}
          <div className="md:col-span-3 rounded-2xl border border-[var(--navy)]/10 bg-white p-7 shadow-[0_1px_2px_rgba(14,24,44,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--navy)]/45">
              Review breakdown
            </p>
            <ul className="mt-5 space-y-3">
              {t.distribution.map((d) => (
                <li key={d.stars} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-[var(--navy)]/70">
                    {d.stars}-star
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--navy)]/8">
                    <span
                      className="block h-full rounded-full bg-[var(--gold)]"
                      style={{ width: `${d.percent}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold text-[var(--navy)]">
                    {d.percent}%
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 border-t border-[var(--navy)]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-relaxed text-[var(--navy)]/50">
                Source: Trustpilot, as shown on {verified}.
              </p>
              <a
                href={t.profileUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--navy)] px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Read reviews on Trustpilot
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrustpilotSection;
