/**
 * Saved Dashboard → SEO wording for place pages (areas, attractions,
 * distilleries, stations, universities, hospitals, cruise ports, corporate).
 *
 * Browser-safe: used by page heads, page headings and the staff console.
 *
 * The switch stays OFF until the owner approves the new wording: while it is
 * off no record is read, so live titles, descriptions and headings are
 * exactly today's text. Canonical URLs are never taken from the record.
 */
export const LOCATION_HUB_CMS_HEAD_ENABLED = false;

/** Address sections whose pages are built from place data. */
export const LOCATION_HUB_SECTIONS = [
  "areas", "attractions", "distilleries", "stations", "universities",
  "hospitals", "cruise-ports", "corporate",
] as const;

export type CmsHead = { seo_title: string; meta_description: string; h1: string };

const META_SWAPS: Array<[key: "name" | "property", value: string, field: "title" | "desc"]> = [
  ["name", "description", "desc"],
  ["property", "og:title", "title"],
  ["property", "og:description", "desc"],
  ["name", "twitter:title", "title"],
  ["name", "twitter:description", "desc"],
];

/** Swap title and description tags for the saved record; everything else is kept. */
export function applyCmsHead<T extends { meta: Array<Record<string, string>> }>(head: T, cms: CmsHead | null | undefined): T {
  if (!cms?.seo_title || !cms.meta_description) return head;
  const meta = head.meta.map((m) => {
    if ("title" in m) return { ...m, title: cms.seo_title };
    for (const [k, v, field] of META_SWAPS) {
      if (m[k] === v) return { ...m, content: field === "title" ? cms.seo_title : cms.meta_description };
    }
    return m;
  });
  return { ...head, meta };
}

export type LiveControl = { live: boolean; reason: string };

/**
 * Whether a saved record is what visitors see on cabslink.com.
 * Mirrors the page loaders: redirects run first, airport and route pages read
 * records directly (built-in route pages win), place pages only when the
 * switch above is on and the place exists.
 */
export function recordControlsLivePage(
  rec: { path: string; publication_status: string },
  ctx: {
    redirectFrom: Set<string>;
    isBuiltInRoute: (slug: string) => boolean;
    placeSlugs: Set<string>;
    cmsEnabled?: boolean;
  },
): LiveControl {
  if (rec.publication_status !== "published") return { live: false, reason: "Not published" };
  if (ctx.redirectFrom.has(rec.path)) return { live: false, reason: "Address redirects elsewhere" };
  const [, section, slug = ""] = rec.path.split("/");
  if (section === "airports" && slug) return { live: true, reason: "Airport page reads this record" };
  if (section === "routes" && slug) {
    return ctx.isBuiltInRoute(slug)
      ? { live: false, reason: "Copy of the built-in route page; edits here don't change it" }
      : { live: true, reason: "Route page reads this record" };
  }
  if ((LOCATION_HUB_SECTIONS as readonly string[]).includes(section) && slug) {
    if (!ctx.placeSlugs.has(slug)) return { live: false, reason: "No live page at this address" };
    return (ctx.cmsEnabled ?? LOCATION_HUB_CMS_HEAD_ENABLED)
      ? { live: true, reason: "Title, description and heading come from this record" }
      : { live: false, reason: "Page uses place data (waiting for approval)" };
  }
  return { live: false, reason: "No page reads this record" };
}
