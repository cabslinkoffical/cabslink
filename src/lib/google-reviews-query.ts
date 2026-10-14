import { queryOptions } from "@tanstack/react-query";
import { getGoogleReviews } from "./google-reviews.functions";

export const googleReviewsQuery = queryOptions({
  queryKey: ["google-reviews"],
  queryFn: () => getGoogleReviews(),
  staleTime: 30 * 60_000,
  retry: false,
});