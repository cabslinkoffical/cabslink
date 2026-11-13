/** Live SEO checks shown while staff type in admin editors (browser-safe, pure). */
export type SeoCheckInput = {
  title: string; description: string; h1?: string; keyword?: string; body?: string; slug?: string;
};
export type SeoCheck = { id: string; ok: boolean; level: "error" | "warn"; text: string };

export const TITLE_MAX = 60;
export const DESC_MAX = 155;
export const MIN_WORDS = 300;

export const wordCount = (s = "") => s.replace(/[#*_>`\-\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;

export function runSeoChecks(i: SeoCheckInput): SeoCheck[] {
  const t = i.title.trim(), d = i.description.trim(), h = (i.h1 ?? "").trim(), k = (i.keyword ?? "").trim().toLowerCase();
  const all = `${t} ${d} ${h} ${i.body ?? ""}`;
  const out: SeoCheck[] = [
    { id: "title", ok: t.length >= 20 && t.length <= TITLE_MAX, level: "error", text: `Title ${t.length}/${TITLE_MAX} characters (aim 20–${TITLE_MAX})` },
    { id: "desc", ok: d.length >= 70 && d.length <= DESC_MAX, level: "error", text: `Description ${d.length}/${DESC_MAX} characters (aim 70–${DESC_MAX})` },
    { id: "fare", ok: !/fixed[\s-]fares?/i.test(all), level: "warn", text: 'Say "fixed price", not "fixed fare"' },
  ];
  if (i.h1 !== undefined) {
    out.push({ id: "h1", ok: h.length > 0, level: "error", text: "Page has a main heading (H1)" });
    if (i.body !== undefined) out.push({ id: "h1-body", ok: !/^#\s/m.test(i.body), level: "warn", text: "Body has no second H1 (use ## for headings)" });
  }
  if (k) {
    out.push({ id: "kw-title", ok: t.toLowerCase().startsWith(k) || t.toLowerCase().slice(0, 30).includes(k), level: "warn", text: "Main keyword near the start of the title" });
    out.push({ id: "kw-desc", ok: d.toLowerCase().includes(k), level: "warn", text: "Main keyword in the description" });
    if (i.h1 !== undefined) out.push({ id: "kw-h1", ok: h.toLowerCase().includes(k), level: "warn", text: "Main keyword in the H1" });
  }
  if (i.body !== undefined) {
    const w = wordCount(i.body);
    out.push({ id: "words", ok: w >= MIN_WORDS, level: "warn", text: `${w} words of content (aim ${MIN_WORDS}+)` });
    out.push({ id: "todo", ok: !/\bTODO\b/.test(i.body), level: "error", text: "No unfinished TODO notes in the text" });
  }
  if (i.slug !== undefined) out.push({ id: "slug", ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.slug), level: "error", text: "Web address uses lowercase words and hyphens only" });
  return out;
}
