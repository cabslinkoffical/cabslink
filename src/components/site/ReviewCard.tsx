/**
 * Review card shared by the homepage section and the /reviews page, so both
 * surfaces render the same review the same way.
 *
 * Only renders what the source channel actually shows: name, score, date,
 * topic, and a verbatim quote when one has been copied. There is no fallback
 * quote — a card without an excerpt simply shows its topic label.
 */
import { ArrowUpRight } from "lucide-react";
import { Star } from "lucide-react";
import { reviewChannel, type UnifiedReview } from "@/lib/reviews";
import { TrustpilotStars } from "./TrustpilotMark";

/** Generic star row for non-Trustpilot channels, in the site's gold. */
function GoldStars({ rating, label }: { rating: number; label?: string }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={label ?? `${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]"
              : "h-3.5 w-3.5 text-[var(--navy)]/20"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function ReviewCard({ review }: { review: UnifiedReview }) {
  const channel = reviewChannel(review.channel);
  const scoreLabel = `${review.author} rated Cabslink ${review.stars} out of 5 on ${channel.name}`;

  return (
    <li className="flex flex-col rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-[0_1px_2px_rgba(14,24,44,0.04)]">
      {review.channel === "trustpilot" ? (
        <TrustpilotStars rating={review.stars} size="sm" label={scoreLabel} />
      ) : (
        <GoldStars rating={review.stars} label={scoreLabel} />
      )}

      {review.excerpt ? (
        <blockquote className="mt-3 text-sm leading-relaxed text-[var(--navy)]/75">
          “{review.excerpt}”
        </blockquote>
      ) : (
        <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--navy)]/75">
          {review.topic}
        </p>
      )}

      <div className="mt-auto pt-4">
        <p className="text-xs font-semibold text-[var(--navy)]">{review.author}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--navy)]/50">
          {review.dateLabel}
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: channel.brandColor }}
              aria-hidden="true"
            />
            {channel.name}
          </span>
        </p>
        {review.url ? (
          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--navy)]/70 hover:text-[var(--gold-ink)]"
          >
            Read on {channel.name}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default ReviewCard;
