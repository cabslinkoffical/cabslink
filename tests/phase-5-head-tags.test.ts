import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { buildPageHead, normalizeHead, canonicalUrl, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "@/lib/seo/page-head";
import { followRedirects, createTtlCache } from "@/lib/seo/redirect-resolver";
import { PUBLIC_ROUTES, SITEMAP_EXCLUDED, fetchAllPages } from "@/lib/sitemap-routes";

const tag = (meta: Record<string, string>[], k: string) => meta.find((m) => m.property === k || m.name === k)?.content;

function assertComplete(h: { meta: Record<string, string>[]; links: Record<string, string>[] }) {
  const canon = h.links.filter((l) => l.rel === "canonical");
  expect(canon).toHaveLength(1);
  expect(canon[0].href).toMatch(/^https:\/\/cabslink\.com\/[^?#]*$/);
  expect(tag(h.meta, "og:url")).toBe(canon[0].href);
  for (const k of ["og:title", "og:description", "og:image", "og:image:alt", "twitter:title", "twitter:description", "twitter:image"]) {
    expect(tag(h.meta, k), k).toBeTruthy();
  }
  expect(tag(h.meta, "og:image")).toMatch(/^https:\/\//);
  expect(tag(h.meta, "twitter:card")).toBe("summary_large_image");
  expect(tag(h.meta, "og:title")).toBe(h.meta.find((m) => "title" in m)?.title);
  expect(tag(h.meta, "keywords")).toBeUndefined();
}

describe("Phase 5 — page head builder", () => {
  it("builds absolute canonical without query string and absolute image", () => {
    const h = buildPageHead({ title: "T", description: "D", path: "/blog/x?utm=1#a", image: "/tours/glencoe-highlands.jpg" });
    assertComplete(h);
    expect(h.links[0].href).toBe("https://cabslink.com/blog/x");
    expect(tag(h.meta, "og:image")).toBe("https://cabslink.com/tours/glencoe-highlands.jpg");
  });

  it("normalizeHead upgrades legacy heads and drops keywords + duplicates", () => {
    const h = normalizeHead({
      meta: [
        { title: "Fleet" },
        { name: "description", content: "desc" },
        { name: "keywords", content: "a,b" },
        { property: "og:title", content: "old" },
        { name: "robots", content: "noindex,follow" },
      ],
      links: [{ rel: "canonical", href: "https://cabslink.com/fleet" }],
      scripts: [{ type: "application/ld+json", children: "{}" }],
    });
    assertComplete(h);
    expect(h.meta.filter((m) => m.property === "og:title")).toHaveLength(1);
    expect(tag(h.meta, "robots")).toBe("noindex,follow");
    expect((h as { scripts: unknown[] }).scripts).toHaveLength(1);
  });

  it("default title and 150–160 character description", () => {
    expect(DEFAULT_TITLE).toBe("Edinburgh Airport Transfers & Private Tours | Cabslink");
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThanOrEqual(150);
    expect(DEFAULT_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });

  it("canonicalUrl forces https", () => {
    expect(canonicalUrl("http://cabslink.com/a?b=1")).toBe("https://cabslink.com/a");
  });

  it("every public route head goes through the builder", () => {
    const dir = "src/routes";
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") && f !== "__root.tsx");
    const missing = files.filter((f) => {
      const s = readFileSync(`${dir}/${f}`, "utf8");
      if (!/\bhead:/.test(s)) return false;
      return !/normalizeHead\(|buildAutoHead\(|hubHead\(|serviceLocationHead\(|journeyHead\(|guideHead\(|buildSeoHead\(|buildPageHead\(/.test(s);
    });
    expect(missing).toEqual([]);
    const shared = [
      "src/lib/seo/auto-seo.ts", "src/lib/seo/hub-head.ts", "src/components/site/ServiceLocationPage.tsx",
      "src/components/site/JourneyPage.tsx", "src/components/site/GuidePage.tsx", "src/components/seo/SeoPageRenderer.tsx",
    ];
    for (const f of shared) expect(readFileSync(f, "utf8"), f).toMatch(/return normalizeHead\(/);
  });

  it("root head carries no page-level social tags and no Google Fonts", () => {
    const s = readFileSync("src/routes/__root.tsx", "utf8");
    const head = s.slice(s.indexOf("head: () => ({"), s.indexOf("shellComponent"));
    for (const k of ["twitter:title", "twitter:description", "og:title", "og:description", "og:url"]) expect(head).not.toContain(k);
    expect(head).not.toMatch(/googleapis|gstatic/);
    expect(s).toContain('"/services.php": "/services"');
  });
});

describe("Phase 5 — redirects", () => {
  const table = (rows: Record<string, string>) => async (p: string) => (rows[p] ? { to_path: rows[p], status_code: "301" } : null);

  it("follows a chain of up to 3 hops to the final URL", async () => {
    expect(await followRedirects("/a", table({ "/a": "/b", "/b": "/c", "/c": "/d" }))).toEqual({ to: "/d", code: 301 });
    expect(await followRedirects("/a", table({ "/a": "/b" }))).toEqual({ to: "/b", code: 301 });
    expect(await followRedirects("/x", table({}))).toBeNull();
  });

  it("refuses loops and chains longer than 3", async () => {
    expect(await followRedirects("/a", table({ "/a": "/b", "/b": "/a" }))).toBeNull();
    expect(await followRedirects("/a", table({ "/a": "/b", "/b": "/c", "/c": "/d", "/d": "/e" }))).toBeNull();
  });

  it("TTL cache expires", () => {
    let t = 0;
    const c = createTtlCache<number>(30_000, () => t);
    c.set("k", 1);
    t = 29_999; expect(c.get("k")).toBe(1);
    t = 30_000; expect(c.get("k")).toBeUndefined();
  });
});

describe("Phase 5 — sitemap and robots", () => {
  it("excludes booking, utility and legal pages", () => {
    for (const p of ["/book", "/book/hourly", "/book/tour", "/distance", "/privacy", "/terms", "/cookies", "/image-credits"]) {
      expect(SITEMAP_EXCLUDED).toContain(p);
      expect(PUBLIC_ROUTES).not.toContain(p);
    }
  });

  it("pages rows in 1000-row chunks", async () => {
    const calls: [number, number][] = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      const n = Math.max(0, Math.min(2500, to + 1) - from);
      return { data: Array.from({ length: n }, (_, i) => from + i) };
    });
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("robots.txt blocks /auth$ and /api/", () => {
    const r = readFileSync("public/robots.txt", "utf8");
    expect(r).toMatch(/^Disallow: \/auth\$$/m);
    expect(r).toMatch(/^Disallow: \/api\/$/m);
  });
});
