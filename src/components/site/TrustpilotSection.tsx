/**
 * Reviews proof section for the homepage.
 *
 * Keeps the layout that was signed off — score card, breakdown, a short row of
 * review cards, attribution — but the cards now come from the shared review
 * registry (`src/lib/reviews.ts`) sorted newest-first, so the homepage always
 * shows the latest reviews and picks up new channels automatically as they go
 * live. The full set lives on /reviews.
 *
 * Deliberate omissions:
 *  - NO Review / AggregateRating structured data. Google's rules do not allow a
 *    site to mark up third-party review scores as its own review data, so the
 *    proof here is a visible Trustpilot link and attribution instead.
 *  - NO wording implying the reviews are verified, invited or representative
 *    while Trustpilot's "no recent history of asking for reviews" notice is up.
 *  - NO review text unless a verbatim excerpt has been copied into the data
 *    file; cards render name, score, date and topic on their own until then.
 */
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { TRUSTPILOT, trustpilotVerifiedOnLabel } from "@/lib/trustpilot";
import { latestReviews, reviewChannel } from "@/lib/reviews";
import { TrustpilotStars, TrustpilotWordmark } from "./TrustpilotMark";
import { TestimonialsColumn, type TestimonialColumnItem } from "@/components/ui/testimonials-columns-1";

export function TrustpilotSection() {
  const t = TRUSTPILOT;
  const verified = trustpilotVerifiedOnLabel(t);
  const reviews = latestReviews(6);

  // Newest-first reviews, dealt round-robin into three scrolling columns so the
  // most recent entries are visible in every column set.
  const items: TestimonialColumnItem[] = reviews.map((r) => ({
    text: r.excerpt ? `\u201C${r.excerpt}\u201D` : r.topic,
    name: r.author,
    role: `${reviewChannel(r.channel).name} \u00B7 ${r.dateLabel}`,
    href: r.url,
    meta: <TrustpilotStars rating={r.stars} size="sm" />,
  }));
  const columns: TestimonialColumnItem[][] = [[], [], []];
  items.forEach((item, i) => columns[i % 3]!.push(item));

  return (
    <section className="section-y bg-white" aria-labelledby="trustpilot-heading">
      <div className="container-x">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-[600px] text-center"
        >
          <div className="inline-flex rounded-full border border-[var(--navy)]/15 px-4 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">
              Independent Reviews
            </span>
          </div>

          <h2
            id="trustpilot-heading"
            className="mt-6 font-display text-4xl font-bold leading-[1.05] text-[var(--navy)] md:text-5xl"
          >
            Rated <span className="text-[var(--gold-ink)]">{t.ratingLabel}</span> on Trustpilot.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--navy)]/60 md:text-base">
            A selection of the latest reviews published on Cabslink’s independent Trustpilot profile.
            The complete set of {t.reviewCount} stays on Trustpilot, unedited.
          </p>
        </motion.div>

        {/* Score + distribution */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-5">
          <div className="sm:col-span-2 rounded-2xl border border-[var(--navy)]/10 bg-white p-6 text-center shadow-[0_1px_2px_rgba(14,24,44,0.04)] md:p-7">
            <div className="font-display text-5xl font-bold leading-none text-[var(--navy)]">
              {t.rating.toFixed(1)}
              <span className="text-2xl text-[var(--navy)]/35"> / 5</span>
            </div>
            <div className="mt-4 flex justify-center">
              <TrustpilotStars rating={t.rating} size="md" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{t.ratingLabel}</p>
            <p className="mt-1 text-xs text-[var(--navy)]/55">
              {t.reviewCount} reviews on Trustpilot
            </p>
          </div>

          <div className="sm:col-span-3 rounded-2xl border border-[var(--navy)]/10 bg-white p-6 shadow-[0_1px_2px_rgba(14,24,44,0.04)] md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--navy)]/45">
              Review breakdown
            </p>
            <ul className="mt-5 space-y-3">
              {t.distribution.map((d) => (
                <li key={d.stars} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-medium text-[var(--navy)]/70">
                    {d.stars}-star
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--navy)]/8">
                    <span
                      className="block h-full rounded-full bg-[var(--gold)]"
                      style={{ width: `${d.percent}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-xs font-semibold text-[var(--navy)]">
                    {d.percent}%
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--navy)]/10 pt-5">
              <a
                href={t.profileUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Read all {t.reviewCount} reviews
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link
                to="/reviews"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:text-[var(--gold-ink)]"
              >
                Latest reviews on Cabslink
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Latest Trustpilot reviews — scrolling columns, not a review wall */}
        <div className="mt-10 flex justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] max-h-[560px]">
          <TestimonialsColumn testimonials={columns[0]!} duration={17} />
          <TestimonialsColumn testimonials={columns[1]!} className="hidden md:block" duration={21} />
          <TestimonialsColumn testimonials={columns[2]!} className="hidden lg:block" duration={19} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-6 py-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            See the latest reviews
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href={t.profileUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--navy)]/20 px-6 py-3 text-xs font-semibold text-[var(--navy)] transition-colors hover:border-[var(--gold)]"
          >
            Read all {t.reviewCount} reviews on Trustpilot
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>


        {/* Attribution + the caveat Trustpilot itself displays */}
        <div className="mx-auto mt-8 max-w-4xl rounded-2xl bg-[var(--navy)]/[0.03] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TrustpilotWordmark className="text-sm text-[var(--navy)]" />
            <a
              href={t.profileUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:text-[var(--gold-ink)]"
            >
              View the Cabslink profile on Trustpilot
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--navy)]/50">
            Ratings, review counts and reviewer names shown above are as displayed on Trustpilot on{" "}
            {verified}; this is a dated snapshot, not a live feed.
            {t.noRecentInviteHistory
              ? " Trustpilot currently notes that this profile has no recent history of asking customers for reviews, so these reviews were left independently and may not represent all Cabslink journeys."
              : ""}{" "}
            Trustpilot is a registered trademark of Trustpilot A/S and is not affiliated with
            Cabslink.
          </p>
        </div>
      </div>
    </section>
  );
}

export default TrustpilotSection;
