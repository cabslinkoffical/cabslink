import { describe, expect, it } from "vitest";
import { isCacheablePageRequest } from "@/lib/html-edge-cache";

const req = (path: string, init?: RequestInit) => new Request(`https://cabslink.com${path}`, init);

describe("edge page cache scope", () => {
  it("caches public pages", () => {
    expect(isCacheablePageRequest(req("/"))).toBe(true);
    expect(isCacheablePageRequest(req("/airports/edinburgh-airport"))).toBe(true);
  });
  it("never caches booking, admin, auth or api paths", () => {
    for (const p of ["/book", "/booking/abc", "/manage-booking", "/track-booking", "/cabs-booking-pannel", "/auth", "/api/public/collect", "/search"]) {
      expect(isCacheablePageRequest(req(p))).toBe(false);
    }
  });
  it("skips query strings, files, POST and signed-in requests", () => {
    expect(isCacheablePageRequest(req("/?utm_source=x"))).toBe(false);
    expect(isCacheablePageRequest(req("/robots.txt"))).toBe(false);
    expect(isCacheablePageRequest(req("/", { method: "POST" }))).toBe(false);
    expect(isCacheablePageRequest(req("/", { headers: { authorization: "Bearer x" } }))).toBe(false);
  });
});
