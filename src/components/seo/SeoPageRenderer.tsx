import { Link } from "@tanstack/react-router";
import type { PublicSeoPage, PublicSeoSection } from "@/lib/seo-public.functions";
import type { RelatedBundle, RelatedLink } from "@/lib/seo-related.functions";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";

/**
 * Renders a published seo_pages record + its sections.
 * Auto-appends nearby-airports / nearby-cities / popular-routes sections
 * from related bundle when the CMS-authored sections don't already cover them.
 */
export function SeoPageRenderer({
  page,
  related,
}: {
  page: PublicSeoPage;
  related?: RelatedBundle | null;
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

  return (
    <SiteLayout>
    <div className="min-h-screen bg-background">
      <section className="relative border-b bg-background">
        {hero && (
          <div className="absolute inset-0 -z-10 opacity-30">
            <img src={hero} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <Breadcrumbs page={page} />
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mt-2">{page.h1}</h1>
          {page.short_intro && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">{page.short_intro}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/book">Book now</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/contact">Get a quote</Link></Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-12 max-w-4xl">
        {allSections.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </div>
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

function Breadcrumbs({ page }: { page: PublicSeoPage }) {
  const crumbs = buildCrumbs(page);
  if (crumbs.length <= 1) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {i < crumbs.length - 1 ? (
              <a href={c.href} className="hover:underline">{c.label}</a>
            ) : (
              <span className="text-foreground">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
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
        <div className="space-y-4">
          {items.map((it: any, i: number) => (
            <details key={i} className="rounded-lg border bg-card p-4">
              <summary className="cursor-pointer font-medium">{it.question}</summary>
              <p className="mt-2 text-muted-foreground text-sm">{it.answer}</p>
            </details>
          ))}
        </div>
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

const ORG_JSONLD = {
  "@type": "LocalBusiness",
  "@id": "https://cabslink.com/#business",
  name: "CabsLink",
  url: "https://cabslink.com",
  image: "https://cabslink.com/og-image.png",
  priceRange: "££",
  areaServed: { "@type": "Country", name: "United Kingdom" },
  telephone: "+44",
};

export function buildSeoHead(
  page: PublicSeoPage,
  origin: string,
  related?: RelatedBundle | null,
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

  const graph: any[] = [
    { ...ORG_JSONLD },
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

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
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

function buildTravelActionLd(page: PublicSeoPage, related: RelatedBundle, url: string) {
  if (page.page_type !== "route") return null;
  const first = related.popular_routes[0];
  if (!first) return null;
  return {
    "@type": "TravelAction",
    name: page.h1,
    url,
    agent: { "@id": "https://cabslink.com/#business" },
    fromLocation: { "@type": "Place", name: first.label.split("→")[0]?.trim() ?? "Origin" },
    toLocation: { "@type": "Place", name: first.label.split("→")[1]?.trim() ?? "Destination" },
  };
}
