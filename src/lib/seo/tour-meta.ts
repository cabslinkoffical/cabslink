/**
 * Search-result text for a tour page and the staff SEO checklist.
 *
 * The public /tours/:slug head and the staff Tour routes screen both call
 * these, so the Google preview staff see is exactly what the page outputs.
 */
import { tourSeo } from "@/lib/seo/tour-seo";
import { tourExtras } from "@/content/tour-extras";
import { DESC_MAX } from "@/lib/seo-live-checks";

export type TourMetaInput = {
  slug: string;
  name: string;
  short_description?: string | null;
  meta_description?: string | null;
  long_day?: boolean | null;
};

export function tourMetaTitle(d: Pick<TourMetaInput, "slug" | "name">): string {
  const seo = tourSeo(d.slug);
  if (seo?.metaTitle) return seo.metaTitle;
  const shortName = d.name.split(":")[0].trim();
  return (
    [
      `${d.name} — Private Driver Tour | Cabslink`,
      `${d.name} | Cabslink`,
      `${shortName} Private Tour | Cabslink`,
      `${shortName} | Cabslink`,
    ].find((t) => t.length <= 60) ??
    `${shortName.slice(0, 47).replace(/[\s,.;:—-]+\S*$/, "")} | Cabslink`
  );
}

/** Where the title comes from, so staff know what they can edit. */
export function tourTitleSource(slug: string): "fixed" | "automatic" {
  return tourSeo(slug)?.metaTitle ? "fixed" : "automatic";
}

export function tourMetaDescription(d: TourMetaInput): string {
  const seo = tourSeo(d.slug);
  let desc = d.meta_description?.trim() || seo?.metaDescription || "";
  if (desc) return desc;
  // Fallback only for tours with no override yet: CMS blurbs are often a
  // single short line, so top up to the 110-155 window on a word boundary.
  const base = (d.short_description ?? `Private driver tour of ${d.name}.`).trim();
  const extras = [
    d.long_day ? "Full-day itinerary with flexible stop times." : "Flexible stop times at every point of interest.",
    "Door-to-door pickup, quoted before you travel.",
  ];
  desc = base;
  for (const part of extras) {
    if (desc.length >= 110) break;
    if (desc.toLowerCase().includes(part.slice(0, 18).toLowerCase())) continue;
    desc = `${desc.replace(/\.$/, "")}. ${part}`;
  }
  if (desc.length > 155) desc = `${desc.slice(0, 152).replace(/[\s,.;:—-]+\S*$/, "")}…`;
  return desc;
}

export type SeoCheck = { id: string; label: string; ok: boolean; hint: string };

function wordCount(...parts: (string | null | undefined)[]) {
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

/** Plain checks on what Google and AI search read from a tour page. */
export function tourSeoChecks(t: any, stopCount: number): { checks: SeoCheck[]; score: number } {
  const title = tourMetaTitle(t);
  const desc = tourMetaDescription(t);
  const faq = Array.isArray(t.faq) ? t.faq.filter((x: any) => x?.q && x?.a) : [];
  const extraFaqs = tourExtras(t.slug, t.duration_hours)?.faqs ?? [];
  const words = wordCount(
    t.description, t.itinerary_md, t.included_md, t.excluded_md, t.suits_md,
    ...faq.flatMap((x: any) => [x.q, x.a]),
  );
  const checks: SeoCheck[] = [
    { id: "title", label: "Page title fits Google (60 characters or fewer)", ok: title.length <= 60, hint: `${title.length} characters` },
    {
      id: "desc",
      label: `Own search description (110–${DESC_MAX} characters)`,
      ok: !!t.meta_description?.trim() && desc.length >= 110 && desc.length <= DESC_MAX,
      hint: t.meta_description?.trim() ? `${desc.length} characters` : "Using an automatic description — write your own",
    },
    { id: "image", label: "Main photo added", ok: !!t.hero_image_url, hint: "Shown on the page and when shared" },
    { id: "words", label: "At least 600 words of written content", ok: words >= 600, hint: `${words} words` },
    { id: "itinerary", label: "Timed itinerary filled in", ok: !!t.itinerary_md?.trim(), hint: "Helps AI search answer “what happens on the day”" },
    { id: "included", label: "What's included listed", ok: !!(t.included_md?.trim() || (Array.isArray(t.included) && t.included.length)), hint: "Clear inclusions reduce questions" },
    { id: "faq", label: "At least 3 questions and answers", ok: faq.length + extraFaqs.length >= 3, hint: `${faq.length + extraFaqs.length} questions` },
    { id: "category", label: "Category chosen (Tours page filter)", ok: !!t.theme_group, hint: "Groups the tour with similar trips" },
    { id: "stops", label: "Stops on the route", ok: stopCount > 0, hint: `${stopCount} stops` },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { checks, score };
}
