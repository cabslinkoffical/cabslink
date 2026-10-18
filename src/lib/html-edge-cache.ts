/**
 * Edge cache for public, anonymous HTML pages.
 *
 * Every public page is identical for every visitor, but rendering it costs
 * several backend round-trips (4–7 s measured). We keep a rendered copy in the
 * Cloudflare edge cache and serve it instantly; copies older than FRESH_MS are
 * re-rendered in the background (stale-while-revalidate), so admin edits show
 * up within a few minutes. Browsers still get no-store HTML.
 *
 * The cache key includes the build id, so a new deploy never serves HTML that
 * points at deleted asset files.
 */
declare const __BUILD_ID__: string;

const FRESH_MS = 5 * 60_000;
const MAX_AGE_S = 24 * 60 * 60;
const STAMP = "x-cabslink-cached-at";

const PRIVATE = /^\/(api|_|@|cabs-booking-pannel|auth|book|booking|manage-booking|track-booking|search|src|node_modules)(\/|$)/;

type Ctx = { waitUntil?: (p: Promise<unknown>) => void } | undefined;

export function isCacheablePageRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.search) return false;
  if (url.pathname.includes(".")) return false;
  if (PRIVATE.test(url.pathname)) return false;
  if (request.headers.has("authorization")) return false;
  return true;
}

function edgeCache(): Cache | null {
  try {
    return (globalThis as any).caches?.default ?? null;
  } catch {
    return null;
  }
}

function keyFor(request: Request): Request {
  const url = new URL(request.url);
  const build = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
  url.searchParams.set("__b", build);
  return new Request(url.toString(), { method: "GET" });
}

async function store(cache: Cache, key: Request, response: Response) {
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  headers.set(STAMP, String(Date.now()));
  headers.set("cache-control", `public, max-age=${MAX_AGE_S}`);
  await cache.put(key, new Response(body, { status: 200, headers }));
}

export async function serveWithEdgeCache(
  request: Request,
  ctx: Ctx,
  render: () => Promise<Response>,
): Promise<Response> {
  const cache = edgeCache();
  if (!cache || !isCacheablePageRequest(request)) return render();
  const key = keyFor(request);

  const refresh = async () => {
    const fresh = await render();
    if (fresh.status === 200 && (fresh.headers.get("content-type") ?? "").includes("text/html")) {
      await store(cache, key, fresh.clone());
    }
    return fresh;
  };

  let hit: Response | undefined;
  try {
    hit = await cache.match(key);
  } catch {
    hit = undefined;
  }

  if (hit) {
    const age = Date.now() - Number(hit.headers.get(STAMP) ?? 0);
    if (age > FRESH_MS) ctx?.waitUntil?.(refresh().catch(() => undefined));
    const headers = new Headers(hit.headers);
    headers.delete(STAMP);
    return new Response(hit.body, { status: 200, headers });
  }

  const fresh = await render();
  if (fresh.status === 200 && (fresh.headers.get("content-type") ?? "").includes("text/html")) {
    const copy = fresh.clone();
    const job = store(cache, key, copy).catch(() => undefined);
    if (ctx?.waitUntil) ctx.waitUntil(job);
  }
  return fresh;
}
