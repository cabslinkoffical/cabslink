import { describe, expect, it } from "vitest";
import { SPECIALIST_LINKS } from "@/lib/seo/specialist-links";
import { applyResponsePolicy } from "@/lib/response-policy";

describe("Semrush audit fixes", () => {
  it("every specialist page gets links from at least two pages", () => {
    const count = new Map<string, number>();
    for (const links of Object.values(SPECIALIST_LINKS)) for (const l of links) count.set(l.href, (count.get(l.href) ?? 0) + 1);
    expect(count.size).toBe(12);
    for (const [href, n] of count) expect(n, href).toBeGreaterThanOrEqual(2);
  });
  it("hashed JS files get a one-year immutable cache and HSTS", () => {
    const res = applyResponsePolicy(new Request("https://cabslink.com/assets/main-abc123.js"), new Response("x", { headers: { "content-type": "text/javascript" } }));
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000; includeSubDomains");
  });
});
