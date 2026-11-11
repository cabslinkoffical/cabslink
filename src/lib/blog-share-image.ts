import { DEFAULT_OG_IMAGE } from "@/lib/seo/page-head";

const SITE = "https://cabslink.com";

/** Same-site paths that are real files: CDN assets or the site default. Anything else (e.g. old /tours/*.jpg) 404s. */
function usable(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  const m = u.match(/^(?:https?:\/\/(?:www\.)?cabslink\.com)?(\/.*)$/i);
  if (m) {
    const path = m[1];
    if (path.startsWith("/__l5e/assets-v1/") || path === "/og-image.jpg") return SITE + path;
    return null;
  }
  return /^https:\/\//i.test(u) ? u : null;
}

/** Blog share image: saved share image, then featured image, then the site default. */
export function blogShareImage(og: string | null | undefined, featured: string | null | undefined): string {
  return usable(og) ?? usable(featured) ?? DEFAULT_OG_IMAGE;
}
