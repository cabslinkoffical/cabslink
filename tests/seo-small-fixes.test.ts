import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { dedupeSitemapEntries, canonicalSitemapPath, PUBLIC_ROUTES } from "@/lib/sitemap-routes";
import { airportFaqFor } from "@/content/airport-faqs";
import { SITE } from "@/lib/site";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|sql|json|md)$/.test(f) && !f.endsWith("routeTree.gen.ts")) out.push(p);
  }
  return out;
}

describe("only the UK phone number is used", () => {
  const files = [...walk("src"), ...walk("supabase")];
  it("has no stray +1 (315) 961-8102 number", () => {
    for (const f of files) {
      const t = readFileSync(f, "utf8");
      expect(t, f).not.toMatch(/961[-\s.]?8102/);
      expect(t, f).not.toMatch(/\(315\)/);
    }
  });
  it("every tel: link in code uses the UK number", () => {
    const uk = SITE.phoneUK.replace(/[^\d+]/g, "");
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/tel:(\+\d+)/g)) expect(m[1], f).toBe(uk);
    }
  });
});

describe("sitemap de-duplication", () => {
  it("normalises canonical paths", () => {
    expect(canonicalSitemapPath("/Routes/a/")).toBe("/routes/a");
    expect(canonicalSitemapPath("/")).toBe("/");
  });
  it("lists each canonical URL once and keeps the newest lastmod", () => {
    const out = dedupeSitemapEntries([
      ["/routes/a", null], ["/routes/a/", "2026-01-02"], ["/routes/A", "2025-05-01"], ["/b", null],
    ]);
    expect(out).toEqual([["/routes/a", "2026-01-02"], ["/b", null]]);
  });
  it("static routes produce no duplicates", () => {
    const out = dedupeSitemapEntries(PUBLIC_ROUTES.map((p) => [p, null] as [string, null]));
    expect(new Set(out.map(([p]) => p)).size).toBe(out.length);
  });
});

describe("Edinburgh Airport FAQ", () => {
  const faqs = airportFaqFor("/airports/edinburgh-airport");
  const text = faqs.map((f) => `${f.q} ${f.a}`).join(" ");
  it("covers the agreed facts", () => {
    expect(faqs.length).toBeGreaterThanOrEqual(5);
    for (const s of ["fixed", "name board", "Stripe", "10.3 miles", "33 minutes", "48 miles", "80 minutes", "40 miles", "55 minutes"])
      expect(text).toContain(s);
  });
  it("makes no unconfirmed claims", () => {
    expect(text).not.toMatch(/flight track|free waiting|minutes free|terminal|£|chauffeur/i);
  });
});
