/**
 * Auto-SEO head builder. Produces the full head() payload for a leaf
 * destination route: title, meta description, canonical, OG/Twitter,
 * robots directive, and a JSON-LD @graph combining Organization + WebSite
 * (with SearchAction) + Breadcrumb + type-specific schema + FAQPage +
 * Speakable.
 */
import type { LoadedDestination } from "@/components/site/DestinationPage";
import { destinationHref } from "@/lib/destinations.functions";
import { getTemplate } from "@/lib/seo/template-registry";
import { evaluateQuality } from "@/lib/seo/quality";
import { faqsFor } from "@/lib/seo/content-engine";
import {
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
  speakableSchema,
  websiteSchema,
} from "@/components/seo/schema";

const SITE_URL = "https://cabslink.lovable.app";

export type HeadPayload = {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<{ type: string; children: string }>;
};

export function buildAutoHead(loaded: LoadedDestination | undefined | null): HeadPayload {
  if (!loaded) {
    return {
      meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }],
      links: [],
      scripts: [],
    };
  }
  const d = loaded.destination;
  const tpl = getTemplate(d.type);
  const quality = evaluateQuality(d);
  const title = tpl.titleTemplate(d);
  const description = tpl.descriptionStem(d).slice(0, 160);
  const canonical = `${SITE_URL}${destinationHref(d)}`;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: d.type === "guide" ? "article" : "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (quality.effectiveNoindex) meta.push({ name: "robots", content: "noindex,follow" });

  const graph: Record<string, unknown>[] = [
    organizationSchema(),
    websiteSchema(),
    breadcrumbSchema(buildBreadcrumbItems(d, tpl.hubSegment, tpl.hubLabel)),
    ...tpl.typeSchema(d),
  ];

  const faq = faqsFor(loaded);
  if (faq.length) graph.push(faqSchema(faq));

  graph.push(speakableSchema([".speakable", "h1"]));

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      },
    ],
  };
}

function buildBreadcrumbItems(
  d: LoadedDestination["destination"],
  hubSegment: string,
  hubLabel: string,
): Array<{ name: string; url: string }> {
  const items: Array<{ name: string; url: string }> = [
    { name: "Home", url: "/" },
    { name: hubLabel, url: `/${hubSegment}` },
  ];
  if (d.region) items.push({ name: d.region, url: `/${hubSegment}` });
  items.push({ name: d.display_name ?? d.name, url: `/${hubSegment}/${d.slug}` });
  return items;
}
