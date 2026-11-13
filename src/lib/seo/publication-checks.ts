/**
 * Publication checks for Dashboard → SEO records, computed over the whole
 * published set at once (same thresholds as the per-record quality check).
 */
import { TITLE_MAX, DESC_MAX } from "@/lib/seo-live-checks";

export type CheckPage = {
  id: string;
  path: string;
  seo_title: string | null;
  meta_description: string | null;
  h1: string | null;
  short_intro: string | null;
  featured_image_url: string | null;
  og_image_url: string | null;
};

export type PublicationIssue = {
  page_id: string;
  issue_type: string;
  severity: "info" | "warning" | "blocker";
  message: string;
  payload: Record<string, unknown>;
};

export function buildPublicationIssues(pages: CheckPage[], visibleSectionPageIds: string[]): PublicationIssue[] {
  const out: PublicationIssue[] = [];
  const byTitle = new Map<string, CheckPage[]>();
  const byDesc = new Map<string, CheckPage[]>();
  for (const p of pages) {
    const t = (p.seo_title ?? "").trim().toLowerCase();
    const d = (p.meta_description ?? "").trim().toLowerCase();
    if (t) byTitle.set(t, [...(byTitle.get(t) ?? []), p]);
    if (d) byDesc.set(d, [...(byDesc.get(d) ?? []), p]);
  }
  const sections = new Map<string, number>();
  for (const id of visibleSectionPageIds) sections.set(id, (sections.get(id) ?? 0) + 1);

  for (const p of pages) {
    const add = (issue_type: string, severity: PublicationIssue["severity"], message: string, payload: Record<string, unknown> = {}) =>
      out.push({ page_id: p.id, issue_type, severity, message, payload });
    const title = p.seo_title ?? "";
    const desc = p.meta_description ?? "";
    if (!p.h1?.trim()) add("missing_h1", "blocker", "Missing H1.");
    const dupT = (byTitle.get(title.trim().toLowerCase()) ?? []).filter((x) => x.id !== p.id);
    if (title && dupT.length) add("duplicate_title", "blocker", `Same title as ${dupT[0].path}`, { with: dupT.map((x) => x.path) });
    const dupD = (byDesc.get(desc.trim().toLowerCase()) ?? []).filter((x) => x.id !== p.id);
    if (desc && dupD.length) add("duplicate_meta", "blocker", `Same description as ${dupD[0].path}`, { with: dupD.map((x) => x.path) });
    if (title.length < 30) add("short_title", "warning", "Title is short (aim for 30–60 characters).", { length: title.length });
    if (title.length > TITLE_MAX) add("long_title", "warning", `Title may be cut off in Google (over ${TITLE_MAX} characters).`, { length: title.length });
    if (desc.length < 90) add("short_meta", "warning", `Description is short (aim for 90–${DESC_MAX} characters).`, { length: desc.length });
    if (desc.length > DESC_MAX) add("long_meta", "warning", `Description may be cut off in Google (over ${DESC_MAX} characters).`, { length: desc.length });
    if ((p.short_intro ?? "").length < 120) add("thin_intro", "warning", "Short intro is under 120 characters.");
    if (!p.featured_image_url) add("no_featured_image", "info", "No featured image set.");
    if ((sections.get(p.id) ?? 0) < 3) add("thin_content", "info", "Fewer than 3 visible sections on this record.", { sections: sections.get(p.id) ?? 0 });
  }
  return out;
}
