/**
 * Compact Trustpilot strip for conversion surfaces (booking, quote, enquiry
 * pages). Same data source and the same constraints as the homepage section:
 * dated snapshot wording, visible attribution, no review structured data, and
 * no claim that the reviews are verified or representative.
 *
 * Kept to a single row so it reassures without competing with the form.
 */
import { ArrowUpRight } from "lucide-react";
import { TRUSTPILOT, trustpilotVerifiedOnLabel } from "@/lib/trustpilot";
import { TrustpilotStars, TrustpilotWordmark } from "./TrustpilotMark";

export function TrustpilotStrip({ className = "" }: { className?: string }) {
  const t = TRUSTPILOT;

  return (
    <aside
      className={`rounded-2xl border border-[var(--navy)]/10 bg-white p-4 shadow-[0_1px_2px_rgba(14,24,44,0.04)] ${className}`}
      aria-label="Cabslink rating on Trustpilot"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <TrustpilotStars rating={t.rating} size="sm" />
        <p className="text-xs font-semibold text-[var(--navy)]">
          {t.rating.toFixed(1)}/5 <span className="text-[var(--navy)]/50">·</span> {t.ratingLabel}
          <span className="ml-1 font-normal text-[var(--navy)]/55">
            ({t.reviewCount} reviews)
          </span>
        </p>
        <TrustpilotWordmark className="text-xs text-[var(--navy)]/70" />
        <a
          href={t.profileUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:text-[var(--gold-ink)]"
        >
          Read reviews
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--navy)]/45">
        As shown on Trustpilot on {trustpilotVerifiedOnLabel(t)}.
        {t.noRecentInviteHistory
          ? " Trustpilot notes this profile has no recent history of asking customers for reviews."
          : ""}
      </p>
    </aside>
  );
}

export default TrustpilotStrip;
