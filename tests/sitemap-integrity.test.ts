import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_ROUTES } from "@/routes/sitemap[.]xml";

/**
 * Phase H — sitemap integrity gate.
 * Every URL we advertise in the sitemap must be servable by a real route file,
 * either as a static file route or via a dynamic segment route.
 */

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const files = readdirSync(ROUTES_DIR);

function resolvable(path: string): boolean {
  if (path === "/") return existsSync(join(ROUTES_DIR, "index.tsx"));
  const segs = path.replace(/^\//, "").split("/");

  // Static file route: a/b -> a.b.tsx | a.b.index.tsx | a/b.tsx
  const dotted = segs.join(".");
  if (files.includes(`${dotted}.tsx`) || files.includes(`${dotted}.index.tsx`)) return true;
  if (existsSync(join(ROUTES_DIR, ...segs.slice(0, -1), `${segs.at(-1)}.tsx`))) return true;

  // Dynamic route: replace the last segment with a param file (a.$slug.tsx)
  const dynamicLast = [...segs.slice(0, -1), "$"].join(".");
  return files.some((f) => f.startsWith(dynamicLast) && f.endsWith(".tsx"));
}

describe("sitemap integrity", () => {
  it("advertises at least the full published surface", () => {
    expect(PUBLIC_ROUTES.length).toBeGreaterThan(50);
  });

  it("has no duplicate URLs", () => {
    const dupes = PUBLIC_ROUTES.filter((p, i) => PUBLIC_ROUTES.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it("uses clean, lowercase, absolute paths without trailing slashes", () => {
    const bad = PUBLIC_ROUTES.filter((p) => p !== "/" && (!p.startsWith("/") || p.endsWith("/") || p !== p.toLowerCase() || /\s|\?|#/.test(p)));
    expect(bad).toEqual([]);
  });

  it("maps every sitemap URL to an existing route file", () => {
    const unresolved = PUBLIC_ROUTES.filter((p) => !resolvable(p));
    expect(unresolved).toEqual([]);
  });
});
