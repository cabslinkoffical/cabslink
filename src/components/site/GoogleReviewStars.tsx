import { Star } from "lucide-react";

export function GoogleReviewStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 on Google`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} aria-hidden="true" className={star <= Math.round(rating) ? "size-4 fill-primary text-primary" : "size-4 text-muted-foreground"} />
      ))}
    </span>
  );
}