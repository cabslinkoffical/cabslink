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

/**
 * Per-isolate memory layer in front of the edge cache. Some hosting setups
 * accept cache.put() without ever returning hits, so warm isolates keep their
 * own small copy of recently rendered pages.
 */
const MEMORY_LIMIT = 150;
const memory = new Map<string, { body: ArrayBuffer; headers: [string, string][] }>();

const memoryCache = {
  async match(key: Request): Promise<Response | undefined> {
    const entry = memory.get(key.url);
    if (!entry) return undefined;
    memory.delete(key.url);
    memory.set(key.url, entry);
    return new Response(entry.body.slice(0), { status: 200, headers: entry.headers });
  },
  async put(key: Request, response: Response): Promise<void> {
    const body = await response.arrayBuffer();
    memory.delete(key.url);
    memory.set(key.url, { body, headers: [...response.headers.entries()] });
    while (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value as string);
  },
};

function layeredCache(edge: Cache | null): Cache {
  return {
    async match(key: Request) {
      const local = await memoryCache.match(key);
      if (local) return local;
      if (!edge) return undefined;
      const hit = await edge.match(key);
      if (hit) await memoryCache.put(key, hit.clone());
      return hit;
    },
    async put(key: Request, response: Response) {
      const copy = response.clone();
      await memoryCache.put(key, copy);
      if (edge) await edge.put(key, response).catch(() => undefined);
    },
  } as unknown as Cache;
}

function edgeCache(): Cache | null {
  let edge: Cache | null = null;
  try {
    edge = (globalThis as any).caches?.default ?? null;
  } catch {
    edge = null;
  }
  return layeredCache(edge);
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

/** Test helper: forget the per-isolate page copies. */
export function clearMemoryPageCache() {
  memory.clear();
}
