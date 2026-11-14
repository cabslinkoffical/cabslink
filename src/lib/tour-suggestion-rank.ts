/**
 * Orders hourly-hire / tour stop suggestions: places that fit the chosen hours
 * (round-trip miles inside the allowance AND drive time + visit inside the hours)
 * come first, scenic points and top-rated places leading; the rest follow.
 */
export type RankablePlace = {
  roundTripMiles: number | null;
  recommendedMinutes: number;
  category: string | null;
  featured: boolean;
  reviewCount: number;
};

const SCENIC = /view|scenic|loch|lake|castle|glen|mountain|hill|park|garden|beach|waterfall|landmark|monument|nature|national|bridge|island|forest|coast/i;

export function fitsHours(p: RankablePlace, includedMiles: number, hours: number | undefined, avgMph: number): boolean {
  if (p.roundTripMiles == null) return true;
  if (p.roundTripMiles > includedMiles) return false;
  if (!hours) return true;
  return (p.roundTripMiles / avgMph) * 60 + p.recommendedMinutes <= hours * 60;
}

export function isScenic(category: string | null): boolean {
  return !!category && SCENIC.test(category);
}

export function rankSuggestions<T extends RankablePlace>(places: T[], includedMiles: number, hours: number | undefined, avgMph: number): T[] {
  const score = (p: T) => ({ fit: fitsHours(p, includedMiles, hours, avgMph), scenic: isScenic(p.category) });
  return [...places].sort((a, b) => {
    const sa = score(a), sb = score(b);
    if (sa.fit !== sb.fit) return sa.fit ? -1 : 1;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (sa.scenic !== sb.scenic) return sa.scenic ? -1 : 1;
    if (a.reviewCount !== b.reviewCount) return b.reviewCount - a.reviewCount;
    return (a.roundTripMiles ?? Infinity) - (b.roundTripMiles ?? Infinity);
  });
}
