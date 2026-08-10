/**
 * /reviews — the full review hub.
 *
 * Purpose: one page that (a) shows every review we can legitimately show,
 * (b) explains every channel a customer can review us on, including the ones
 * that are not live yet, and (c) makes it obvious which reviews are hosted by an
 * independent platform rather than by us.
 *
 * Honesty constraints baked into this page:
 *  - Channels with nothing public yet are labelled "Coming soon" and never
 *    padded with placeholder reviews.
 *  - The video section renders an explicit empty state until a real video is
 *    added to VIDEO_REVIEWS — no stock footage standing in for a customer.
 *  - No Review/AggregateRating structured data: these are third-party scores on
 *    third-party platforms, so the proof is a visible link and attribution.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, ExternalLink, Clock, Video, MessageSquareQuote, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ReviewCard } from "@/components/site/ReviewCard";
import { TrustpilotStars, TrustpilotWordmark } from "@/components/site/TrustpilotMark";
import { organizationSchema } from "@/components/seo/schema";
import { TRUSTPILOT, trustpilotVerifiedOnLabel } from "@/lib/trustpilot";
import {
  REVIEW_CHANNELS,
  VIDEO_REVIEWS,
  allReviews,
  liveReviewChannels,
  plannedReviewChannels,
  reviewTotals,
} from "@/lib/reviews";

const TITLE = "Cabslink Reviews — Ratings & Customer Feedback";
const DESCRIPTION =
  "Cabslink reviews: our independent Trustpilot rating, a selection of the latest written reviews, and every channel where you can review us next.";
const URL = "https://cabslink.com/reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    // Organization + Breadcrumb only. No Review/AggregateRating markup: the
    // scores below are third-party Trustpilot data, which Google does not
    // allow a site to mark up as its own review data.
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
            { "@type": "ListItem", position: 2, name: "Reviews", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationSchema()),
      },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const t = TRUSTPILOT;
  const verified = trustpilotVerifiedOnLabel(t);
  const reviews = allReviews();
  const totals = reviewTotals();
  const live = liveReviewChannels();
  const planned = plannedReviewChannels();

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="navy-scene">
        <div className="container-x py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex rounded-full border border-[var(--gold)]/30 px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
                Reviews
              </span>
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] text-white md:text-6xl">
              Cabslink reviews — <span className="text-[var(--gold)]">on platforms we do not control.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              We would rather point you at reviews we do not control than write our own. Our rating
              lives on Trustpilot, and we are opening more ways to review a journey — including short
              video reviews on YouTube and star ratings on Google.
            </p>
          </motion.div>

          {/* Score summary */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
              <div className="font-display text-4xl font-bold leading-none text-white">
                {t.rating.toFixed(1)}
                <span className="text-xl text-white/40"> / 5</span>
              </div>
              <div className="mt-3">
                <TrustpilotStars rating={t.rating} size="sm" />
              </div>
              <p className="mt-2 text-xs text-white/60">
                {t.ratingLabel} on Trustpilot · {t.reviewCount} reviews
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
              <p className="font-display text-4xl font-bold leading-none text-white">
                {totals.shownOnPage}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
                Written reviews shown
              </p>
              <p className="mt-2 text-xs text-white/60">
                Read the full set of {t.reviewCount} on Trustpilot.
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
              <p className="font-display text-4xl font-bold leading-none text-white">
                {totals.video}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
                Video reviews
              </p>
              <p className="mt-2 text-xs text-white/60">
                {totals.video === 0 ? "First clips being filmed now." : "Filmed by passengers."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
              <p className="font-display text-4xl font-bold leading-none text-white">
                {totals.liveChannels + totals.plannedChannels}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
                Review channels
              </p>
              <p className="mt-2 text-xs text-white/60">
                {totals.liveChannels} live, {totals.plannedChannels} on the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ALL WRITTEN REVIEWS */}
      <section className="section-y bg-white" aria-labelledby="written-reviews-heading">
        <div className="container-x">
          <div className="max-w-2xl">
            <h2
              id="written-reviews-heading"
              className="font-display text-3xl font-bold text-[var(--navy)] md:text-4xl"
            >
              Latest Trustpilot reviews
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--navy)]/60">
              A selection of {totals.shownOnPage} of the {t.reviewCount} reviews published on
              Cabslink’s independent Trustpilot profile, newest first. Each card links to the
              profile so you can read it in full — the complete set stays on Trustpilot.
            </p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={t.profileUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-6 py-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Read all {t.reviewCount} reviews on Trustpilot
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="text-xs text-[var(--navy)]/50">
              We show {totals.shownOnPage} here; Trustpilot holds the complete, unedited set of
              {" "}{t.reviewCount}.
            </p>
          </div>
        </div>
      </section>

      {/* VIDEO REVIEWS */}
      <section className="section-y bg-[var(--navy)]/[0.03]" aria-labelledby="video-reviews-heading">
        <div className="container-x">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--navy)]/15 px-4 py-1.5">
              <Video className="h-3.5 w-3.5 text-[var(--gold-ink)]" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold-ink)]">
                Video reviews
              </span>
            </div>
            <h2
              id="video-reviews-heading"
              className="mt-5 font-display text-3xl font-bold text-[var(--navy)] md:text-4xl"
            >
              Reviews you can watch, not just read
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--navy)]/60">
              We are inviting passengers to film a short clip about their transfer or tour — the
              pickup, the driver, the car, whatever mattered on the day. Published clips are hosted on
              YouTube and embedded here, credited to whoever filmed them.
            </p>
          </div>

          {VIDEO_REVIEWS.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center">
              <Clock className="mx-auto h-6 w-6 text-[var(--gold-ink)]" aria-hidden="true" />
              <p className="mt-4 font-display text-xl font-bold text-[var(--navy)]">
                No video reviews published yet
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--navy)]/60">
                The first clips are being filmed now. We would rather show this honestly than fill the
                space with stock footage — as soon as a passenger sends one through and agrees to it
                being published, it appears here.
              </p>
              <p className="mt-5 text-sm text-[var(--navy)]/70">
                Travelled with us and happy to film 30 seconds?{" "}
                <Link
                  to="/contact"
                  className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:text-[var(--gold-ink)]"
                >
                  Get in touch
                </Link>{" "}
                and we will tell you where to send it.
              </p>
            </div>
          ) : (
            <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {VIDEO_REVIEWS.map((v) => (
                <li
                  key={v.id}
                  className="overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-white shadow-[0_1px_2px_rgba(14,24,44,0.04)]"
                >
                  <div className="aspect-video w-full bg-[var(--navy)]">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
                      title={v.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-display text-base font-bold text-[var(--navy)]">{v.title}</p>
                    {v.journey ? (
                      <p className="mt-1 text-xs text-[var(--navy)]/55">{v.journey}</p>
                    ) : null}
                    <p className="mt-3 text-xs font-semibold text-[var(--navy)]">{v.author}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--navy)]/50">
                      {v.dateLabel} · YouTube
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* CHANNELS */}
      <section className="section-y bg-white" aria-labelledby="channels-heading">
        <div className="container-x">
          <div className="max-w-2xl">
            <h2
              id="channels-heading"
              className="font-display text-3xl font-bold text-[var(--navy)] md:text-4xl"
            >
              Where you can review Cabslink
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--navy)]/60">
              We are deliberately spreading reviews across platforms we do not control. Below is every
              channel, including the ones still being set up — marked clearly so nothing here looks
              live before it is.
            </p>
          </div>

          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REVIEW_CHANNELS.map((c) => (
              <li
                key={c.id}
                className="flex flex-col rounded-2xl border border-[var(--navy)]/10 bg-white p-6 shadow-[0_1px_2px_rgba(14,24,44,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.brandColor }}
                      aria-hidden="true"
                    />
                    <p className="font-display text-lg font-bold text-[var(--navy)]">{c.name}</p>
                  </div>
                  <span
                    className={
                      c.status === "live"
                        ? "shrink-0 rounded-full bg-[var(--navy)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                        : "shrink-0 rounded-full border border-[var(--navy)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--navy)]/50"
                    }
                  >
                    {c.status === "live" ? "Live" : "Coming soon"}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
                  {c.blurb}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--navy)]/65">{c.detail}</p>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:text-[var(--gold-ink)]"
                  >
                    Leave a review on {c.name}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--navy)]/40">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    Not open for reviews yet
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LEAVE A REVIEW */}
      <section className="section-y bg-[var(--navy)]/[0.03]" aria-labelledby="leave-review-heading">
        <div className="container-x">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--navy)]/10 bg-white p-8 text-center md:p-12">
            <MessageSquareQuote className="mx-auto h-7 w-7 text-[var(--gold-ink)]" aria-hidden="true" />
            <h2
              id="leave-review-heading"
              className="mt-5 font-display text-3xl font-bold text-[var(--navy)] md:text-4xl"
            >
              Travelled with us? Tell the truth.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--navy)]/65">
              Good or bad, a review on an independent platform is worth more to the next traveller
              than anything we could write about ourselves. Trustpilot is the fastest way today.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href={t.profileUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Star className="h-4 w-4" aria-hidden="true" />
                Review us on Trustpilot
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--navy)]/20 px-6 py-3 text-sm font-semibold text-[var(--navy)] transition-colors hover:border-[var(--gold)]"
              >
                Send feedback directly
              </Link>
            </div>
          </div>

          {/* Attribution + the caveat Trustpilot itself displays */}
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-white p-5">
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
              Ratings, review counts, reviewer names and dates on this page are as displayed on
              Trustpilot on {verified}; this is a dated snapshot, not a live feed.
              {t.noRecentInviteHistory
                ? " Trustpilot currently notes that this profile has no recent history of asking customers for reviews, so these reviews were left independently and may not represent all Cabslink journeys."
                : ""}{" "}
              Where a review has no quotation, no one has copied the reviewer's exact wording across
              yet — follow the link to read it in full rather than relying on our summary. Trustpilot
              is a registered trademark of Trustpilot A/S and is not affiliated with Cabslink; Google,
              YouTube and Facebook are trademarks of their respective owners.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--navy)]/40">
              Live channels: {live.map((c) => c.name).join(", ")}. Coming soon:{" "}
              {planned.map((c) => c.name).join(", ")}.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
