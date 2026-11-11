import { INDEXNOW_HOST, INDEXNOW_KEY, INDEXNOW_KEY_LOCATION } from "@/lib/seo/indexnow-key";

export const INDEXNOW_MAX_URLS = 10_000;

function absolute(p: string): string {
  if (/^https?:\/\//.test(p)) return p;
  return `https://${INDEXNOW_HOST}${p.startsWith("/") ? p : `/${p}`}`;
}

/** Submit URLs to IndexNow in batches of 10,000. Returns last HTTP status (0 = network failure). Never throws. */
export async function submitIndexNow(paths: string[]): Promise<{ sent: number; status: number }> {
  const urls = [...new Set(paths.filter(Boolean).map(absolute))];
  if (!urls.length) return { sent: 0, status: 0 };
  let status = 0;
  let sent = 0;
  for (let i = 0; i < urls.length; i += INDEXNOW_MAX_URLS) {
    const urlList = urls.slice(i, i + INDEXNOW_MAX_URLS);
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: INDEXNOW_HOST, key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_LOCATION, urlList }),
        signal: AbortSignal.timeout(15000),
      });
      status = res.status;
      if (res.ok) sent += urlList.length;
      else console.error("IndexNow rejected submission", res.status);
    } catch (err) {
      console.error("IndexNow submission failed", err);
      status = 0;
    }
  }
  return { sent, status };
}

/** Fire-and-forget ping used after admin saves. */
export async function pingIndexNow(paths: string[]): Promise<boolean> {
  const r = await submitIndexNow(paths);
  return r.sent > 0;
}

/** Fire-and-forget: run in the background so the admin save never waits. */
export function notifyIndexNowInBackground(paths: string[] | Promise<string[]>): void {
  void Promise.resolve(paths).then((p) => submitIndexNow(p)).catch((e) => console.error("IndexNow background ping failed", e));
}

/** Published SEO-page paths that belong to an admin entity (location, airport, route, service). */
export async function publicPathsForEntity(sb: any, id: string): Promise<string[]> {
  const { data, error } = await sb.from("seo_pages").select("path, robots_status")
    .eq("publication_status", "published")
    .or(`primary_entity_id.eq.${id},secondary_entity_id.eq.${id},service_id.eq.${id}`);
  if (error) { console.error("IndexNow entity lookup failed", error); return []; }
  return (data ?? []).filter((r: any) => !String(r.robots_status ?? "").includes("noindex")).map((r: any) => r.path as string);
}
