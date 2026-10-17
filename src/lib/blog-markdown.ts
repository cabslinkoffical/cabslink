/**
 * Shared markdown helpers for the blog: table-of-contents extraction, word
 * counting, and the pure text operations behind the admin editor toolbar.
 * Keeping these pure makes them testable without a browser.
 */

export type TocItem = { id: string; text: string; level: number };

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
}

/** Extract `##` / `###` headings as table-of-contents entries (deduped ids). */
export function extractToc(md: string): TocItem[] {
  const out: TocItem[] = [];
  const used = new Set<string>();
  for (const line of md.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!m) continue;
    const level = m[1]!.length;
    const text = m[2]!.trim();
    const base = slugify(text) || `h${out.length}`;
    let id = base;
    let i = 1;
    while (used.has(id)) id = `${base}-${i++}`;
    used.add(id);
    out.push({ id, text, level });
  }
  return out;
}

export function wordCount(md: string): number {
  return md.trim() ? md.trim().split(/\s+/).filter(Boolean).length : 0;
}

/** Estimated reading time in minutes (220 wpm, clamped 1–60). */
export function readingMinutes(md: string): number {
  return Math.max(1, Math.min(60, Math.round(wordCount(md) / 220) || 1));
}

export type EditResult = { text: string; start: number; end: number };

/**
 * Wrap the current selection with markdown markers (e.g. `**bold**`).
 * With an empty selection the placeholder is inserted and selected.
 */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
  placeholder = "",
): EditResult {
  const selected = value.slice(start, end) || placeholder;
  const text = value.slice(0, start) + before + selected + after + value.slice(end);
  return { text, start: start + before.length, end: start + before.length + selected.length };
}

/** Insert a block (image, table, rule) on its own paragraph with blank lines around it. */
export function insertBlock(value: string, start: number, end: number, block: string): EditResult {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const prefix = before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = after.startsWith("\n\n") || after.length === 0 ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const text = before + prefix + block + suffix + after;
  const pos = start + prefix.length + block.length;
  return { text, start: pos, end: pos };
}

/**
 * Toggle a `##` / `###` heading on the line containing the cursor.
 * Applying the same level twice removes the heading.
 */
export function formatHeading(value: string, start: number, end: number, level: 2 | 3): EditResult {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEnd = value.indexOf("\n", end);
  const stop = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, stop);
  const marker = "#".repeat(level) + " ";
  const newLine = line.startsWith(marker) ? line.slice(marker.length) : marker + line.replace(/^#{1,6}\s+/, "");
  const text = value.slice(0, lineStart) + newLine + value.slice(stop);
  const pos = lineStart + newLine.length;
  return { text, start: pos, end: pos };
}
