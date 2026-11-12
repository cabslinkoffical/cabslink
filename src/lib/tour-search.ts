type SearchableTour = {
  name: string;
  short_description: string | null;
  origin_label: string | null;
  destination_label: string | null;
  theme: string | null;
  theme_group: string | null;
  category_order: number | null;
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

export function tourSearchThemes(tours: SearchableTour[]) {
  const ordered = new Map<string, number>();
  for (const tour of tours) {
    if (!tour.theme_group || tour.category_order == null) continue;
    ordered.set(tour.theme_group, Math.min(ordered.get(tour.theme_group) ?? Infinity, tour.category_order));
  }
  return [...ordered.keys()].sort((a, b) =>
    (ordered.get(a) ?? 0) - (ordered.get(b) ?? 0) || a.localeCompare(b));
}