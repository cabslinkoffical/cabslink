import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMemoryPageCache, isCacheablePageRequest, serveWithEdgeCache } from "@/lib/html-edge-cache";
beforeEach(() => clearMemoryPageCache());

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
    expect(isCacheablePageRequest(req("/", { headers: { cookie: "session=test" } }))).toBe(false);
  });
});

describe("edge cache serving", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const html = (body: string) => new Response(body, { headers: { "content-type": "text/html" } });

  it("stores public HTML in the background and serves the warm copy without rendering", async () => {
    let saved: Response | undefined;
    const cache = {
      match: vi.fn(async () => saved?.clone()),
      put: vi.fn(async (_key: Request, value: Response) => { saved = value; }),
    };
    vi.stubGlobal("caches", { default: cache });
    const jobs: Promise<unknown>[] = [];
    const ctx = { waitUntil: (job: Promise<unknown>) => { jobs.push(job); } };
    const render = vi.fn(async () => html("public page"));
    expect(await (await serveWithEdgeCache(req("/"), ctx, render)).text()).toBe("public page");
    await Promise.all(jobs);
    const warm = await serveWithEdgeCache(req("/"), ctx, render);
    expect(await warm.text()).toBe("public page");
    expect(render).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(warm.headers.has("x-cabslink-cached-at")).toBe(false);
  });

  it("serves stale HTML immediately and refreshes after five minutes", async () => {
    const stale = html("old page");
    stale.headers.set("x-cabslink-cached-at", String(Date.now() - 5 * 60_000 - 1));
    const put = vi.fn(async (_key: Request, _value: Response) => undefined);
    vi.stubGlobal("caches", { default: { match: async () => stale, put } });
    const jobs: Promise<unknown>[] = [];
    const render = vi.fn(async () => html("new page"));
    const response = await serveWithEdgeCache(req("/"), { waitUntil: (job) => { jobs.push(job); } }, render);
    expect(await response.text()).toBe("old page");
    await Promise.all(jobs);
    expect(render).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(await put.mock.calls[0]?.[1]?.text()).toBe("new page");
  });

  it("renders normally when the edge cache is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    const render = vi.fn(async () => html("fresh page"));
    expect(await (await serveWithEdgeCache(req("/"), undefined, render)).text()).toBe("fresh page");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("never stores failed pages or non-HTML responses", async () => {
    const put = vi.fn();
    vi.stubGlobal("caches", { default: { match: async () => undefined, put } });
    const jobs: Promise<unknown>[] = [];
    const ctx = { waitUntil: (job: Promise<unknown>) => { jobs.push(job); } };
    await serveWithEdgeCache(req("/"), ctx, async () => new Response("failed", { status: 500, headers: { "content-type": "text/html" } }));
    await serveWithEdgeCache(req("/"), ctx, async () => new Response("{}", { headers: { "content-type": "application/json" } }));
    await Promise.all(jobs);
    expect(put).not.toHaveBeenCalled();
  });

  it("never shares session-setting or explicitly private HTML", async () => {
    const put = vi.fn();
    vi.stubGlobal("caches", { default: { match: async () => undefined, put } });
    for (const headers of [{ "set-cookie": "session=test" }, { "cache-control": "private" }, { "cache-control": "no-store" }, { vary: "Cookie" }]) {
      await serveWithEdgeCache(req("/"), undefined, async () => new Response("private", { headers: { "content-type": "text/html", ...headers } }));
    }
    expect(put).not.toHaveBeenCalled();
  });

  it("expires memory copies after 24 hours rather than serving them forever", async () => {
    vi.stubGlobal("caches", undefined);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const render = vi.fn(async () => html("page"));
    await serveWithEdgeCache(req("/"), undefined, render);
    clock.mockReturnValue(now + 24 * 60 * 60_000 + 1);
    await serveWithEdgeCache(req("/"), undefined, render);
    expect(render).toHaveBeenCalledTimes(2);
  });
});

describe("memory page cache", () => {
  it("serves a repeat request without re-rendering when the edge cache never hits", async () => {
    vi.stubGlobal("caches", { default: { match: async () => undefined, put: async () => undefined } });
    const render = vi.fn(async () => new Response("<p>page</p>", { headers: { "content-type": "text/html" } }));
    const r = new Request("https://cabslink.com/areas");
    await serveWithEdgeCache(r, undefined, render);
    await new Promise((res) => setTimeout(res, 0));
    const second = await serveWithEdgeCache(new Request("https://cabslink.com/areas"), undefined, render);
    expect(await second.text()).toBe("<p>page</p>");
    expect(render).toHaveBeenCalledTimes(1);
  });
});
