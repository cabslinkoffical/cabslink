import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { googleReviewsQuery } from "@/lib/google-reviews-query";
import { GOOGLE_PROFILE_URL } from "@/lib/google-reviews.functions";
import { GoogleReviewStars } from "./GoogleReviewStars";
import { TestimonialCard, type TestimonialColumnItem } from "@/components/ui/testimonials-columns-1";
import { uniqueReviews } from "@/lib/unique-reviews";

export function GoogleReviewsSection() {
  const { data, isPending } = useQuery(googleReviewsQuery);
  const hasRating = data && data.reviewCount > 0;
  // Each review is shown exactly once: a short list in a looping scroller
  // made the same review appear twice on screen.
  const items: TestimonialColumnItem[] = [];
  uniqueReviews((data?.reviews ?? []).filter((review) => review.excerpt?.trim())).slice(0, 6).forEach((review) => {
    items.push({
      text: review.excerpt ? `“${review.excerpt}”` : review.topic,
      name: review.author,
      role: `Google · ${review.dateLabel}`,
      href: review.url,
      meta: <GoogleReviewStars rating={review.stars} />,
    });
  });
  return (
    <section className="section-y bg-background" aria-labelledby="google-reviews-heading">
      <div className="container-x">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="text-xs font-semibold uppercase text-primary">Independent Reviews</p>
          <h2 id="google-reviews-heading" className="mt-6 font-display text-4xl font-bold text-foreground md:text-5xl">Cabslink reviews on Google.</h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">Customer reviews from our Google Business Profile.</p>
          {hasRating ? (
            <div className="mt-8 space-y-3">
              <p className="font-display text-5xl font-bold text-foreground">{data.rating.toFixed(1)} <span className="text-2xl text-muted-foreground">/ 5</span></p>
              <GoogleReviewStars rating={data.rating} />
              <p className="text-sm text-muted-foreground">{data.reviewCount} reviews on Google</p>
            </div>
          ) : <p className="mt-8 text-sm text-muted-foreground" role="status">{isPending ? "Loading Google reviews…" : "Read customer reviews on Google."}</p>}
        </div>
        {items.length > 0 ? (
          <div className="mx-auto mt-10 grid max-w-5xl justify-items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => <TestimonialCard key={`${item.name}-${index}`} item={item} className="h-full" />)}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <a href={data?.profileUrl ?? GOOGLE_PROFILE_URL} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-primary underline-offset-4">Read reviews on Google <ExternalLink className="size-4" /></a>
          <Link to="/reviews" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-primary underline-offset-4">All customer reviews <ArrowUpRight className="size-4" /></Link>
        </div>
      </div>
    </section>
  );
}