import { publicServerClient } from "@/lib/seo/public-client.server";

const HOST = "cabslink.com";

/** Tell Bing/Yandex (IndexNow) about changed URLs. Never throws. */
export async function pingIndexNow(paths: string[]): Promise<boolean> {
  if (!paths.length) return false;
  try {
    const { data } = await publicServerClient()
      .from("site_settings_public" as any).select("indexnow_key").eq("id", 1).maybeSingle();
    const key = (data as { indexnow_key?: string } | null)?.indexnow_key;
    if (!key) return false;
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/indexnow-key.txt`,
        urlList: paths.map((p) => `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 202;
  } catch (err) {
    console.error("IndexNow ping failed", err);
    return false;
  }
}
