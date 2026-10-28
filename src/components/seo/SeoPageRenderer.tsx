import { RelatedLinks } from "@/components/site/RelatedLinks";
import { DirectAnswer, firstSentences } from "@/components/seo/DirectAnswer";
import { normalizeHead } from "@/lib/seo/page-head";
import { Link } from "@tanstack/react-router";
import { safeJsonLd } from "@/lib/safe-json-ld";
import type { PublicSeoPage, PublicSeoSection } from "@/lib/seo-public.functions";
import type { RelatedBundle, RelatedLink } from "@/lib/seo-related.functions";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { RouteFareTable } from "@/components/seo/RouteFareTable";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LocalPageHero } from "@/components/site/LocalPageHero";
import { AirportMapSection } from "@/components/site/AirportMapSection";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { defaultLocalImage, localEntityMapFocus } from "@/lib/local-page";

/**
 * Renders a published seo_pages record + its sections.
 * Auto-appends nearby-airports / nearby-cities / popular-routes sections
 * from related bundle when the CMS-authored sections don't already cover them.
 */
export function SeoPageRenderer({
  page,
  related,
  fares,
  appendix,
}: {
  page: PublicSeoPage;
  related?: RelatedBundle | null;
  fares?: RouteFareTableData | null;
  /** Extra content rendered after every existing section (Phase 7). */
  appendix?: import("react").ReactNode;
}) {

  const hero = page.featured_image_url || page.og_image_url || page.entity?.hero_image_url || null;

  // Merge CMS sections with auto-injected related sections (only if not already present)
  const existingTypes = new Set(page.sections.map((s) => s.section_type));
  const autoSections: PublicSeoSection[] = [];
  const nextPos = (page.sections[page.sections.length - 1]?.position ?? 0) + 10;

  if (related) {
    if (related.nearby_airports.length && !existingTypes.has("nearby_airports")) {
      autoSections.push(makeLinkSection("nearby_airports", "Nearby airports", related.nearby_airports, nextPos));
    }
    if (related.popular_routes.length && !existingTypes.has("popular_destinations")) {
      autoSections.push(
        makeLinkSection("popular_destinations", "Popular routes", related.popular_routes, nextPos + 10),
      );
    }
    if (related.nearby_cities.length && !existingTypes.has("nearby_cities")) {
      autoSections.push(makeLinkSection("nearby_cities", "Nearby cities we cover", related.nearby_cities, nextPos + 20));
    }
    if (related.services.length && !existingTypes.has("service_grid")) {
      autoSections.push(makeLinkSection("service_grid", "Our services", related.services, nextPos + 30));
    }
  }

  const allSections = [...page.sections, ...autoSections];

  // Same pattern as every other local page: prefill the booking form from the
  // page's own entity and show the entity's location map when coordinates
  // exist. Nothing is invented for pages without entity data.
  const entityType = page.primary_entity_type as string | null | undefined;
  const entityName = page.entity?.name ?? null;
  const prefill = entityName
    ? entityType === "airport" || entityType === "station"
      ? { pickup: entityName }
      : entityType === "location"
        ? { dropoff: entityName }
        : undefined
    : undefined;
  const mapFocus = localEntityMapFocus(page.entity);
  const crumbs = buildCrumbs(page).map((c) => ({ name: c.label, href: c.href }));

  return (
    <SiteLayout>
    <div className="min-h-screen bg-background">
      <LocalPageHero
        breadcrumbs={crumbs}
        eyebrow={entityType ? entityType.replace(/-/g, " ") : "Cabslink"}
        title={page.h1}
        subtitle={page.short_intro ?? undefined}
        facts={entityName ? [{ label: "Location", value: entityName }] : []}
        prefill={prefill}
        mapFocus={mapFocus}
        showMap={false}
        image={hero ?? defaultLocalImage(entityType)}
        imageAlt={page.entity?.name || page.h1}
        imageCaption={entityName ? `${entityName} · private transfers` : undefined}
      />

      <div className="container mx-auto px-4 py-12 space-y-12 max-w-4xl">
        <DirectAnswer
          sentences={[
            ...firstSentences(page.short_intro || page.meta_description, fares?.fares.length ? 1 : 2),
            fares?.fares.length
              ? `Fixed fares start from ${fares.currencySymbol}${Math.min(...fares.fares.map((f) => f.price)).toFixed(2)} per vehicle for the ${fares.distanceMiles}-mile journey.`
              : null,
          ]}
          updated={(page as { updated_at?: string | null }).updated_at ?? null}
        />
        {fares && fares.fares.length > 0 && (
          <RouteFareTable data={fares} routeName={page.h1.replace(/\s+—.*$/, "")} />
        )}
        {allSections.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
        {appendix}
      </div>

      {entityType === "airport" && <AirportMapSection focus={mapFocus} />}
      <RelatedLinks center={mapFocus ? { lat: mapFocus.lat, lng: mapFocus.lng } : null} />

    </div>
    </SiteLayout>
  );
}

function makeLinkSection(
  section_type: string,
  heading: string,
  items: RelatedLink[],
  position: number,
): PublicSeoSection {
  return {
    id: `auto-${section_type}`,
    section_type,
    position,
    heading,
    body: null,
    structured_payload: { items },
  };
}

function buildCrumbs(page: PublicSeoPage): Array<{ label: string; href: string }> {
  const parts = page.path.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [{ label: "Home", href: "/" }];
  if (parts.length === 0) return crumbs;
  const first = parts[0];
  const firstLabel =
    first === "locations" ? "Locations" :
    first === "airports" ? "Airports" :
    first === "routes" ? "Routes" :
    first === "services" ? "Services" :
    first[0].toUpperCase() + first.slice(1);
  crumbs.push({ label: firstLabel, href: `/${first}` });
  crumbs.push({ label: page.h1, href: page.path });
  return crumbs;
}

function SectionBlock({ section }: { section: PublicSeoSection }) {
  const payload = section.structured_payload || {};

  if (section.section_type === "faqs") {
    const items = Array.isArray((payload as any).items) ? (payload as any).items : [];
    return (
      <section>
        {section.heading && <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>}
        <FaqAccordion
          items={items.map((it: any) => ({ q: it.question, a: it.answer }))}
          defaultOpen={null}
        />
      </section>
    );
  }

  if (
    section.section_type === "popular_destinations" ||
    section.section_type === "nearby_airports" ||
    section.section_type === "nearby_cities" ||
    section.section_type === "service_grid"
  ) {
    const items = Array.isArray((payload as any).items) ? (payload as any).items : [];
    return (
      <section>
        {section.heading && <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it: any, i: number) => (
            <li key={i} className="rounded-lg border bg-card p-4 hover:bg-accent transition">
              {it.href ? (
                <a href={it.href} className="font-medium hover:underline">{it.label}</a>
              ) : (
                <span className="font-medium">{it.label}</span>
              )}
              {it.description && <p className="text-sm text-muted-foreground mt-1">{it.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      {section.heading && <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>}
      {section.body && (
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {section.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </section>
  );
}


function buildSeoHeadRaw(
  page: PublicSeoPage,
  origin: string,
  related?: RelatedBundle | null,
  fares?: RouteFareTableData | null,
) {

  const url = `${origin}${page.canonical_override || page.path}`;
  const image = page.og_image_url || page.featured_image_url || page.entity?.hero_image_url || null;
  const meta: Array<Record<string, string>> = [
    { title: page.seo_title },
    { name: "description", content: page.meta_description },
    { name: "robots", content: page.robots_status || "index,follow" },
    { property: "og:title", content: page.seo_title },
    { property: "og:description", content: page.meta_description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: page.seo_title },
    { name: "twitter:description", content: page.meta_description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }

  // The business entity is declared once in business-graph.ts and emitted
  // site-wide from __root.tsx; here we only reference it by @id.
  const graph: any[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: page.seo_title,
      description: page.meta_description,
      url,
      ...(image ? { primaryImageOfPage: image } : {}),
      dateModified: page.updated_at,
      isPartOf: { "@id": "https://cabslink.com/#website" },
      about: { "@id": "https://cabslink.com/#business" },
    },
    buildBreadcrumbLd(page, origin),
  ];

  const entityLd = buildEntityLd(page, url);
  if (entityLd) graph.push(entityLd);

  const faqLd = buildFaqLd(page);
  if (faqLd) graph.push(faqLd);

  if (related) {
    const travel = buildTravelActionLd(page, related, url);
    if (travel) graph.push(travel);
  }

  // Published fares make the page citable: an AI answer can only quote a
  // price we have actually put on the page. The price lives as `offers`
  // nested inside the Service node — no top-level Offer, no priceValidUntil
  // and no availability (the fares are re-quoted at booking).
  if (fares && fares.fares.length) {
    const prices = fares.fares.map((f) => f.price);
    const routeName = page.h1.replace(/\s+—.*$/, "");
    graph.push({
      "@type": "Service",
      name: `${routeName} private transfer`,
      serviceType: "Airport taxi transfer",
      url,
      provider: { "@id": "https://cabslink.com/#business" },
      offers: {
        "@type": "Offer",
        name: `${routeName} fixed-price taxi transfer`,
        url,
        priceCurrency: fares.currency || "GBP",
        price: Math.min(...prices).toFixed(2),
        offeredBy: { "@id": "https://cabslink.com/#business" },
        priceSpecification: fares.fares.map((f) => ({
          "@type": "UnitPriceSpecification",
          name: f.className,
          price: f.price.toFixed(2),
          priceCurrency: fares.currency || "GBP",
          valueAddedTaxIncluded: fares.taxIncluded,
        })),
      },
    });
  }


  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({ "@context": "https://schema.org", "@graph": graph }),
      },
    ],
  };
}

function buildBreadcrumbLd(page: PublicSeoPage, origin: string) {
  const parts = page.path.split("/").filter(Boolean);
  const items: any[] = [{ "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` }];
  if (parts.length > 0) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: parts[0][0].toUpperCase() + parts[0].slice(1),
      item: `${origin}/${parts[0]}`,
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: page.h1,
      item: `${origin}${page.path}`,
    });
  }
  return { "@type": "BreadcrumbList", itemListElement: items };
}

function buildEntityLd(page: PublicSeoPage, url: string) {
  const e = page.entity;
  if (!e) return null;
  if (e.kind === "airport") {
    return {
      "@type": "Airport",
      name: e.name,
      iataCode: e.iata_code ?? undefined,
      url,
      ...(e.latitude != null && e.longitude != null
        ? { geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude } }
        : {}),
    };
  }
  if (e.kind === "location") {
    return {
      "@type": "Place",
      name: e.name,
      url,
      ...(e.latitude != null && e.longitude != null
        ? { geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude } }
        : {}),
    };
  }
  if (e.kind === "service") {
    return {
      "@type": "Service",
      name: e.name,
      provider: { "@id": "https://cabslink.com/#business" },
      url,
    };
  }
  return null;
}

function buildFaqLd(page: PublicSeoPage) {
  const faq = page.sections.find((s) => s.section_type === "faqs");
  const items = faq && Array.isArray((faq.structured_payload as any)?.items)
    ? (faq.structured_payload as any).items
    : [];
  if (!items.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: items.map((it: any) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

function buildTravelActionLd(page: PublicSeoPage, _related: RelatedBundle, url: string) {
  // Route page types stored in seo_pages: city_to_city_route / airport_route.
  if (!/route/.test(page.page_type)) return null;
  // The route's own H1 is the reliable origin/destination source
  // ("Dundee to Edinburgh Airport — Private Transfer").
  const [from, to] = page.h1.replace(/\s+—.*$/, "").split(/\s+to\s+/i);
  if (!from || !to) return null;
  return {
    "@type": "TravelAction",
    name: page.h1,
    url,
    agent: { "@id": "https://cabslink.com/#business" },
    fromLocation: { "@type": "Place", name: from.trim() },
    toLocation: { "@type": "Place", name: to.trim() },

  };
}


/** Same payload, upgraded to the full canonical/OG/Twitter tag set. */
export function buildSeoHead(
  page: PublicSeoPage,
  origin: string,
  related?: RelatedBundle | null,
  fares?: RouteFareTableData | null,
) {
  return normalizeHead(buildSeoHeadRaw(page, origin, related, fares));
}
