/**
 * Shared head() builder for the destination hub pages (/stations, /distilleries,
 * /attractions, …). Keeps title/description wording in `hub-config.ts` and
 * guarantees every hub emits the same CollectionPage + BreadcrumbList graph,
 * with an optional ItemList of the pages the hub links to.
 */
import { collectionPageSchema } from "@/components/seo/schema";
import { HUBS, type HubKey } from "@/lib/hub-config";

const SITE = "https://cabslink.com";

export type HubListItem = { name: string; url: string };

export function hubTitle(key: HubKey): string {
  const cfg = HUBS[key] as { title: string; seoTitle?: string };
  return cfg.seoTitle ?? `${cfg.title} — CabsLink`;
}

export function itemListSchema(name: string, items: HubListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 100).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url.startsWith("http") ? it.url : `${SITE}${it.url}`,
    })),
  };
}

export function hubHead(key: HubKey, items?: HubListItem[]) {
  const cfg = HUBS[key] as { title: string; intro: string; metaDescription?: string };
  const title = hubTitle(key);
  const description = cfg.metaDescription ?? cfg.intro;
  const url = `${SITE}/${key}`;

  const scripts = [
    {
      type: "application/ld+json",
      children: JSON.stringify(
        collectionPageSchema({
          name: title,
          description,
          url,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: cfg.title, url: `/${key}` },
          ],
        }),
      ),
    },
    ...(items && items.length > 0
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify(itemListSchema(cfg.title, items)),
          },
        ]
      : []),
  ];

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts,
  };
}
