import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { googleReviewsQuery } from "@/lib/google-reviews-query";
import { GOOGLE_PROFILE_URL } from "@/lib/google-reviews.functions";
import { GoogleReviewStars } from "./GoogleReviewStars";

export function GoogleReviewsStrip({ className = "" }: { className?: string }) {
  const { data } = useQuery(googleReviewsQuery);
  const hasRating = data && data.reviewCount > 0;
  return (
    <aside className={`rounded-lg border border-border bg-background p-4 ${className}`} aria-label="Cabslink reviews on Google">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {hasRating ? <GoogleReviewStars rating={data.rating} /> : null}
        <p className="text-xs font-semibold text-foreground">
          {hasRating ? `${data.rating.toFixed(1)}/5 · ${data.reviewCount} Google reviews` : "Reviews on Google"}
        </p>
        <a href={data?.profileUrl ?? GOOGLE_PROFILE_URL} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-foreground underline decoration-primary underline-offset-4">
          Read reviews <ArrowUpRight className="size-3" />
        </a>
      </div>
    </aside>
  );
}