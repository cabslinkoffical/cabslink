/**
 * Pure picker for the shared "Related pages" block. Chooses nearby airports
 * and areas by distance (falling back to a stable rotation), plus a stable
 * rotation of tours, so every listed page gains links from many siblings.
 */
export type RelatedCandidate = { href: string; label: string; lat?: number | null; lng?: number | null };
export type RelatedGroups = { airports: RelatedCandidate[]; areas: RelatedCandidate[]; tours: RelatedCandidate[]; articles?: RelatedCandidate[] };

const COMMON = new Set(["airport", "transfer", "transfers", "private", "tour", "tours", "day", "guide", "cabslink", "scotland", "scottish", "from", "with", "your", "about", "travel", "journey", "edinburgh"]);
export function contentTokens(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((word) => !COMMON.has(word)));
}

/** Rank only genuine topic/location matches; never invent a relationship. */
export function rankRelatedContent<T extends { href: string; label: string; context?: string; theme?: string | null }>(
  candidates: T[], path: string, context: string, theme?: string | null, limit = 3,
): T[] {
  const tokens = contentTokens(context);
  return candidates.filter((c) => c.href !== path)
    .map((c) => ({ c, score: [...contentTokens(`${c.label} ${c.context ?? ""}`)].filter((t) => tokens.has(t)).length + (theme && c.theme === theme ? 100 : 0) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.c.href.localeCompare(b.c.href))
    .slice(0, limit).map((r) => r.c);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (n: number) => (n * Math.PI) / 180;
  const s = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(s));
}

function rotate<T>(list: T[], seed: number, n: number): T[] {
  if (!list.length) return [];
  const start = seed % list.length;
  return [...list.slice(start), ...list.slice(0, start)].slice(0, n);
}

function pick(list: RelatedCandidate[], path: string, center: { lat: number; lng: number } | null, n: number, salt: string) {
  const others = list.filter((c) => c.href !== path);
  if (center) {
    const withCoords = others.filter((c) => typeof c.lat === "number" && typeof c.lng === "number");
    if (withCoords.length >= n) {
      return withCoords
        .map((c) => ({ c, d: miles(center, { lat: c.lat as number, lng: c.lng as number }) }))
        .sort((x, y) => x.d - y.d || x.c.href.localeCompare(y.c.href))
        .slice(0, n)
        .map((x) => x.c);
    }
  }
  return rotate([...others].sort((a, b) => a.href.localeCompare(b.href)), hash(path + salt), n);
}

export function pickRelatedLinks(
  all: RelatedGroups,
  path: string,
  center: { lat: number; lng: number } | null,
  perGroup = 4,
): RelatedGroups {
  const clean = path.replace(/\/+$/, "") || "/";
  return {
    airports: pick(all.airports, clean, center, perGroup, "a"),
    areas: pick(all.areas, clean, center, perGroup, "r"),
    tours: pick(all.tours, clean, null, perGroup, "t"),
  };
}
