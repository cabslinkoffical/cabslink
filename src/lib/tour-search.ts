type SearchableTour = {
  name: string;
  short_description: string | null;
  origin_label: string | null;
  destination_label: string | null;
  theme: string | null;
  theme_group: string | null;
  category_order?: number | null;
};

function searchText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchesTourSearch(tour: SearchableTour, query: string, theme = "") {
  if (theme && searchText(tour.theme_group ?? "") !== searchText(theme)) return false;
  const haystack = searchText([
    tour.name, tour.short_description, tour.origin_label,
    tour.destination_label, tour.theme, tour.theme_group,
  ].filter(Boolean).join(" "));
  return searchText(query).split(" ").filter(Boolean).every((word) => haystack.includes(word));
}

export type TourLength = "" | "half" | "full" | "long";

/**
 * Catalogue length filter. Long-day tours are flagged by admin; the rest
 * split at six hours. A tour with no duration stays visible under every
 * length so filters never hide a bookable tour.
 */
export function matchesTourLength(tour: { duration_hours: number | null; long_day: boolean }, length: TourLength) {
  if (!length) return true;
  if (length === "long") return tour.long_day;
  if (tour.long_day) return false;
  const hours = tour.duration_hours;
  if (hours == null) return true;
  return length === "half" ? hours <= 6 : hours > 6;
}

export function tourSearchThemes(tours: SearchableTour[]) {
  const ordered = new Map<string, number>();
  for (const tour of tours) {
    if (!tour.theme_group || tour.category_order == null) continue;
    ordered.set(tour.theme_group, Math.min(ordered.get(tour.theme_group) ?? Infinity, tour.category_order));
  }
  return [...ordered.keys()].sort((a, b) =>
    (ordered.get(a) ?? 0) - (ordered.get(b) ?? 0) || a.localeCompare(b));
}