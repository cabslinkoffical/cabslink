import type { RouteFareTable } from "@/lib/seo/route-fares.functions";

/** Stored snippets may reference a live display fare, never a saved price. */
export function resolveSearchSnippet(text: string, fares?: RouteFareTable | null): string {
  const prices = fares?.fares.map((f) => f.price).filter((p) => Number.isFinite(p) && p > 0) ?? [];
  const price = prices.length && fares
    ? `${fares.currencySymbol}${Math.min(...prices).toFixed(2).replace(/\.00$/, "")}`
    : null;
  return text.replaceAll("{{from_fare}}", price ? `from ${price}` : "fixed quote");
}