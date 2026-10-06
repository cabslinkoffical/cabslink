/** Small in-memory TTL cache (per server isolate / browser tab). */
export function createTtlCache<V>(ttlMs: number, now: () => number = Date.now) {
  const store = new Map<string, { v: V; exp: number }>();
  return {
    get(key: string): V | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.exp <= now()) {
        store.delete(key);
        return undefined;
      }
      return hit.v;
    },
    set(key: string, v: V) {
      if (store.size > 2000) store.clear();
      store.set(key, { v, exp: now() + ttlMs });
    },
  };
}

export const MAX_REDIRECT_HOPS = 3;

type Row = { to_path: string | null; status_code: string | number | null } | null;

/**
 * Follow admin redirects to their final destination. Returns null (no
 * redirect) when there is none, when the chain loops, or when it is longer
 * than MAX_REDIRECT_HOPS hops.
 */
export async function followRedirects(
  start: string,
  lookup: (from: string) => Promise<Row>,
): Promise<{ to: string; code: 301 | 302 } | null> {
  const seen = new Set([start]);
  let current = start;
  let code: 301 | 302 = 301;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const row = await lookup(current);
    if (!row?.to_path || row.to_path === current) {
      return hop === 0 ? null : { to: current, code };
    }
    if (hop === MAX_REDIRECT_HOPS) return null; // chain too long
    if (seen.has(row.to_path)) return null; // loop
    if (hop === 0) code = Number(row.status_code) === 302 ? 302 : 301;
    seen.add(row.to_path);
    current = row.to_path;
  }
  return null;
}
