import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Phase H — automated SEO validation gates.
 * Static source scan over every route file so metadata regressions fail CI
 * instead of shipping silently.
 */

const ROUTES_DIR = join(process.cwd(), "src", "routes");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx$/.test(name) ? [full] : [];
  });
}

const routeFiles = walk(ROUTES_DIR).filter((f) => !f.endsWith("__root.tsx"));

type Route = { file: string; rel: string; src: string; hasHead: boolean };

const routes: Route[] = routeFiles.map((file) => {
  const src = readFileSync(file, "utf8");
  return {
    file,
    rel: file.slice(ROUTES_DIR.length + 1),
    src,
    hasHead: /\bhead\s*:\s*\(/.test(src),
  };
});

/** Routes exempt from public metadata gates (admin/auth/api-ish surfaces). */
const EXEMPT = (rel: string) =>
  rel.startsWith("_authenticated") || rel.startsWith("auth.") || rel === "auth.tsx" || rel.startsWith("api");

const contentRoutes = routes.filter((r) => !EXEMPT(r.rel));

function extractMeta(src: string, key: string, kind: "name" | "property") {
  const re = new RegExp(`\\{\\s*${kind}:\\s*["']${key}["']\\s*,\\s*content:\\s*["\`]([^"\`]*)["\`]`, "g");
  return [...src.matchAll(re)].map((m) => m[1]);
}

function extractTitles(src: string) {
  return [...src.matchAll(/\{\s*title:\s*["`]([^"`]*)["`]\s*\}/g)]
    .map((m) => m[1])
    // Skip interpolated titles and not-found/fallback branches — they are runtime-derived.
    .filter((t) => !t.includes("${") && !/not found/i.test(t));
}

describe("SEO gate — every content route declares head metadata", () => {
  it.each(contentRoutes.map((r) => r.rel))("%s has a head()", (rel) => {
    const r = contentRoutes.find((x) => x.rel === rel)!;
    expect(r.hasHead).toBe(true);
  });
});

/** Routes that intentionally opt out of indexing, or delegate head() to a shared builder. */
const NOINDEX = (src: string) => /["']noindex/.test(src);
const DELEGATED = (src: string) => /\b(build[A-Za-z]*Head|[a-z][A-Za-z]*Head)\s*\(/.test(src);

describe("SEO gate — head metadata completeness", () => {
  const withHead = contentRoutes.filter((r) => r.hasHead && !NOINDEX(r.src) && !DELEGATED(r.src));

  it.each(withHead.map((r) => r.rel))("%s declares title + description + og pair", (rel) => {
    const { src } = withHead.find((x) => x.rel === rel)!;
    expect(/\{\s*title[:\s}]/.test(src)).toBe(true);
    expect(/name:\s*["']description["']/.test(src)).toBe(true);
    expect(/og:title/.test(src)).toBe(true);
    expect(/og:description/.test(src)).toBe(true);
  });
});


describe("SEO gate — no placeholder or off-brand copy", () => {
  const banned = [/Lovable App/i, /Lovable Generated Project/i, /\bchauffeur/i, /lorem ipsum/i];

  it.each(contentRoutes.map((r) => r.rel))("%s metadata is clean", (rel) => {
    const { src } = contentRoutes.find((x) => x.rel === rel)!;
    const strings = [...extractTitles(src), ...extractMeta(src, "description", "name"), ...extractMeta(src, "og:title", "property"), ...extractMeta(src, "og:description", "property")];
    const offenders = strings.filter((s) => banned.some((b) => b.test(s)));
    expect(offenders).toEqual([]);
  });
});

describe("SEO gate — static titles are unique and well-sized", () => {
  const staticTitles = new Map<string, string[]>();
  for (const r of contentRoutes) {
    for (const t of extractTitles(r.src)) {
      if (!staticTitles.has(t)) staticTitles.set(t, []);
      staticTitles.get(t)!.push(r.rel);
    }
  }

  it("has no duplicate static titles across routes", () => {
    const dupes = [...staticTitles.entries()].filter(([, files]) => new Set(files).size > 1);
    expect(dupes.map(([t, f]) => `${t} -> ${f.join(", ")}`)).toEqual([]);
  });

  it("keeps static titles under 70 characters", () => {
    const tooLong = [...staticTitles.keys()].filter((t) => t.length > 70);
    expect(tooLong).toEqual([]);
  });

  it("keeps static descriptions under 175 characters", () => {
    const tooLong = contentRoutes.flatMap((r) =>
      extractMeta(r.src, "description", "name")
        .filter((d) => d.length > 175)
        .map((d) => `${r.rel}: ${d.length}`),
    );
    expect(tooLong).toEqual([]);
  });
});

describe("SEO gate — canonical and social image hygiene", () => {
  it("never places og:image or twitter:image on the root route", () => {
    const root = readFileSync(join(ROUTES_DIR, "__root.tsx"), "utf8");
    expect(/og:image|twitter:image/.test(root)).toBe(false);
  });

  it("uses absolute https URLs for any og:image / twitter:image", () => {
    const bad = contentRoutes.flatMap((r) =>
      [...extractMeta(r.src, "og:image", "property"), ...extractMeta(r.src, "twitter:image", "name")]
        .filter((u) => u && !u.startsWith("https://"))
        .map((u) => `${r.rel}: ${u}`),
    );
    expect(bad).toEqual([]);
  });

  it("declares a canonical link on content routes with head metadata", () => {
    const missing = contentRoutes
      .filter((r) => r.hasHead && !NOINDEX(r.src) && !DELEGATED(r.src))
      .filter((r) => !/rel:\s*["']canonical["']/.test(r.src))
      .map((r) => r.rel);
    expect(missing).toEqual([]);
  });
});
