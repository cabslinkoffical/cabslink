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
describe("HTML cache headers", () => {
  const html = (init: ResponseInit = {}) => new Response("<p>x</p>", { ...init, headers: { "content-type": "text/html", ...(init.headers as Record<string, string> | undefined) } });
  const cc = (path: string, res = html(), reqInit: RequestInit = {}) =>
    applyResponsePolicy(new Request(`https://cabslink.com${path}`, reqInit), res).headers.get("cache-control");

  for (const path of ["/", "/services", "/fleet", "/tours", "/tours/harry-potter-highland-expedition", "/areas/edinburgh", "/routes/dundee-to-edinburgh-airport", "/airports/edinburgh-airport", "/blog", "/blog/some-post"]) {
    it(`public page ${path} gets a 5-minute shared cache`, () => {
      expect(cc(path)).toBe("public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
    });
  }

  for (const path of ["/book", "/book/tour", "/book/hourly", "/manage-booking", "/booking/ABC123", "/track-booking", "/cabs-booking-pannel", "/cabs-booking-pannel/bookings", "/auth", "/search"]) {
    it(`private page ${path} stays no-store`, () => {
      expect(cc(path)).toBe("no-cache, no-store, must-revalidate");
    });
  }

  it("never shares pages with cookies, sessions, query strings, errors or set-cookie", () => {
    const ns = "no-cache, no-store, must-revalidate";
    expect(cc("/fleet", html(), { headers: { cookie: "sb=1" } })).toBe(ns);
    expect(cc("/fleet", html(), { headers: { authorization: "Bearer x" } })).toBe(ns);
    expect(cc("/fleet?ref=1")).toBe(ns);
    expect(cc("/fleet", html({ status: 404 }))).toBe(ns);
    expect(cc("/fleet", html({ status: 500 }))).toBe(ns);
    expect(cc("/fleet", html({ headers: { "set-cookie": "a=1" } }))).toBe(ns);
    expect(cc("/fleet", html({ headers: { "cache-control": "private" } }))).toBe(ns);
  });
});
