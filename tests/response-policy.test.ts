import { describe, expect, it } from "vitest";
import { applyResponsePolicy, canonicalRequestUrl, HSTS } from "@/lib/response-policy";

describe("canonical redirects", () => {
  for (const origin of ["http://cabslink.com", "http://www.cabslink.com", "https://www.cabslink.com"]) {
    it(`sends ${origin} straight to the HTTPS apex`, () => {
      expect(canonicalRequestUrl(new Request(`${origin}/Areas/Oban/?x=1`))).toBe("https://cabslink.com/areas/oban?x=1");
    });
  }
  it("preserves booking tokens and API paths", () => {
    expect(canonicalRequestUrl(new Request("https://cabslink.com/booking/ABC"))).toBeUndefined();
    expect(canonicalRequestUrl(new Request("https://cabslink.com/api/public/ABC"))).toBeUndefined();
    expect(canonicalRequestUrl(new Request("https://cabslink.com/_serverFn/ABC"))).toBeUndefined();
  });

  for (const path of ["/index", "/index/", "/INDEX", "/index.html"]) {
    it(`sends ${path} to the homepage on the apex`, () => {
      expect(canonicalRequestUrl(new Request(`https://www.cabslink.com${path}`))).toBe("https://cabslink.com/");
      expect(canonicalRequestUrl(new Request(`https://cabslink.com${path}?a=1`))).toBe("https://cabslink.com/");
    });
  }

  it("sends unfilled template links like /blog/category/$slug to the section hub", () => {
    expect(canonicalRequestUrl(new Request("https://cabslink.com/blog/category/$slug"))).toBe("https://cabslink.com/blog");
    expect(canonicalRequestUrl(new Request("https://cabslink.com/blog/category/%24slug"))).toBe("https://cabslink.com/blog");
  });

  it("leaves real category pages and dev source files alone", () => {
    expect(canonicalRequestUrl(new Request("https://cabslink.com/blog/category/airport-guides"))).toBeUndefined();
    expect(canonicalRequestUrl(new Request("http://localhost:8080/src/routes/blog.category.$slug.tsx"))).toBeUndefined();
  });
});

describe("response headers", () => {
  it("adds preload HSTS even to immutable redirects and errors", () => {
    for (const r of [Response.redirect("https://cabslink.com", 301), new Response("error", { status: 500 })]) {
      expect(applyResponsePolicy(new Request("https://cabslink.com"), r).headers.get("strict-transport-security")).toBe(HSTS);
    }
  });
  for (const ext of ["js", "css", "woff2", "woff", "ttf", "png", "jpg", "jpeg", "webp", "svg", "ico"]) {
    it(`caches ${ext} files for one year`, () => {
      expect(applyResponsePolicy(new Request(`https://cabslink.com/assets/file.${ext}`), new Response("asset")).headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    });
  }
  it("never caches HTML, private files, errors or the platform script as immutable", () => {
    for (const [path, response] of [
      ["/file.js", new Response("html", { headers: { "content-type": "text/html" } })],
      ["/api/public/file.js", new Response("private")],
      ["/__l5e/events.js", new Response("platform")],
      ["/missing.js", new Response("missing", { status: 404 })],
      ["/file.js", new Response("private", { headers: { "set-cookie": "session=test" } })],
    ] as const) {
      expect(applyResponsePolicy(new Request(`https://cabslink.com${path}`), response).headers.get("cache-control") ?? "").not.toContain("immutable");
    }
  });
});