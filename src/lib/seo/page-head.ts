import { safeJsonLd } from "@/lib/safe-json-ld";
/**
 * One builder for every public route's <head> tags: title, description,
 * absolute canonical (query string and hash stripped), Open Graph and Twitter
 * tags, and an absolute og:image with alt text.
 */
export const SITE_ORIGIN = "https://cabslink.com";

/** Site-wide social preview image used when a page has no image of its own. */
export const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/NfUvXcpm6DbLcc40gpTySSnGjlC3/social-images/social-1786800106425-social-image.webp";

export const DEFAULT_TITLE = "Edinburgh Airport Transfers & Private Tours | Cabslink";
export const DEFAULT_DESCRIPTION =
  "Fixed-fare Edinburgh Airport transfers, private tours and UK private hire with Cabslink. Meet and greet, flight tracking and secure card payment by Stripe.";

export type PageHeadInput = {
  title: string;
  description: string;
  /** Path ("/fleet") or absolute URL on cabslink.com. */
  path: string;
  /** Absolute URL, or a site-relative path ("/tours/x.jpg") made absolute here. */
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
};

export type HeadTag = Record<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HeadLike = { meta?: any[]; links?: any[]; scripts?: any[]; [key: string]: any };

export function absoluteUrl(pathOrUrl: string): string {
  const raw = (pathOrUrl || "/").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `${SITE_ORIGIN}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export function canonicalUrl(pathOrUrl: string): string {
  const abs = absoluteUrl(pathOrUrl).split("#")[0].split("?")[0];
  return abs.replace(/^http:\/\//i, "https://");
}

export function buildPageHead(input: PageHeadInput): { meta: HeadTag[]; links: HeadTag[] } {
  const url = canonicalUrl(input.path);
  const image = absoluteUrl(input.image || DEFAULT_OG_IMAGE);
  const alt = input.imageAlt || input.title;
  const type = input.type ?? "website";
  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { property: "og:type", content: type },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: alt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: input.title },
      { name: "twitter:description", content: input.description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: alt },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

const SOCIAL_KEYS = new Set([
  "og:type", "og:title", "og:description", "og:url", "og:image", "og:image:alt",
  "twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt",
  "keywords",
]);

/**
 * Merge page-specific extra tags (robots, article:* …) with the builder output,
 * dropping any duplicate social/title/description tags from the extras.
 */
export function withPageHead<T extends HeadLike>(
  input: PageHeadInput,
  extra: T = {} as T,
): T & { meta: HeadTag[]; links: HeadTag[] } {
  extra = withSafeJsonLd(extra);
  const base = buildPageHead(input);
  const meta = (extra.meta ?? []).filter((m) => {
    if ("title" in m) return false;
    const key = m.property ?? m.name;
    if (key === "description") return false;
    return !SOCIAL_KEYS.has(key);
  });
  const links = (extra.links ?? []).filter((l) => l.rel !== "canonical");
  return { ...extra, meta: [...base.meta, ...meta], links: [...base.links, ...links] };
}

/**
 * Upgrade an existing head() payload to the full tag set: reads its title,
 * description, canonical/og:url, og:image and og:type, then rebuilds through
 * buildPageHead. Payloads with no canonical (private/noindex pages) pass
 * through with only the keywords tag removed.
 */
/** Every JSON-LD block goes out through safeJsonLd, whoever built it. */
function withSafeJsonLd<T extends HeadLike>(head: T): T {
  const scripts = (head as { scripts?: Array<Record<string, unknown>> }).scripts;
  if (!scripts?.length) return head;
  return {
    ...head,
    scripts: scripts.map((sc) => {
      if (sc.type !== "application/ld+json" || typeof sc.children !== "string") return sc;
      try { return { ...sc, children: safeJsonLd(JSON.parse(sc.children)) }; } catch { return sc; }
    }),
  };
}

export function normalizeHead<T extends HeadLike>(
  head: T,
  overrides: Partial<PageHeadInput> = {},
): T & { meta: HeadTag[]; links: HeadTag[] } {
  head = withSafeJsonLd(head);
  const meta = head.meta ?? [];
  const links = head.links ?? [];
  const find = (k: string) => meta.find((m) => m.property === k || m.name === k)?.content;
  const title = overrides.title ?? meta.find((m) => "title" in m)?.title;
  const description = overrides.description ?? find("description");
  const path = overrides.path ?? links.find((l) => l.rel === "canonical")?.href ?? find("og:url");
  if (!title || !description || !path) {
    return { ...head, meta: meta.filter((m) => m.name !== "keywords"), links };
  }
  const ogType = find("og:type");
  return withPageHead(
    {
      title,
      description,
      path,
      image: overrides.image ?? find("og:image") ?? null,
      imageAlt: overrides.imageAlt ?? find("og:image:alt"),
      type: overrides.type ?? (ogType === "article" ? "article" : "website"),
    },
    head,
  );
}
