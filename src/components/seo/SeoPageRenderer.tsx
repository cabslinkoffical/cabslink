import { RelatedLinks } from "@/components/site/RelatedLinks";
import { DirectAnswer, firstSentences } from "@/components/seo/DirectAnswer";
import { canonicalUrl, normalizeHead } from "@/lib/seo/page-head";
import { MapPin } from "lucide-react";
import { safeJsonLd } from "@/lib/safe-json-ld";
import type { PublicSeoPage, PublicSeoSection } from "@/lib/seo-public.functions";
import type { RelatedBundle, RelatedLink } from "@/lib/seo-related.functions";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { RouteFareTable } from "@/components/seo/RouteFareTable";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LocalPageHero } from "@/components/site/LocalPageHero";
import { LocalMapSection } from "@/components/site/LocalMapSection";
import { PageBand, EditorialRows, LinkCards, GroupLabel, FaqBand } from "@/components/site/PageBand";
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

  const ctaPlace = entityName ?? page.h1;
  return (
    <SiteLayout cta={{ heading: <>Book your journey: <span className="text-gold">{ctaPlace}</span></>, label: "Get a fixed price", href: "#booking", trackAs: "final_cta_seo_page", subtitle: "Your journey details are already in the booking form above. Check the fixed price before you pay, or call our team any time." }}>
      <LocalPageHero
        breadcrumbs={crumbs}
        eyebrow={entityType ? entityType.replace(/-/g, " ") : "Cabslink"}
        title={page.h1}
        subtitle={page.short_intro ?? undefined}
        prefill={prefill}
        mapFocus={mapFocus}
        showMap={false}
        image={hero ?? defaultLocalImage(entityType)}
        imageAlt={page.entity?.name || page.h1}
        imageCaption={entityName ? `${entityName} · private transfers` : undefined}
        intro={{
          eyebrow: entityType ? entityType.replace(/-/g, " ") : undefined,
          heading: entityName ? `${entityName} at a glance` : "At a glance",
          body: (
            <DirectAnswer
          className="!border-0 !bg-transparent !p-0"
          sentences={[
            ...firstSentences(page.short_intro || page.meta_description, fares?.fares.length ? 1 : 2),
            fares?.fares.length
              ? `Fixed fares start from ${fares.currencySymbol}${Math.min(...fares.fares.map((f) => f.price)).toFixed(2)} per vehicle for the ${fares.distanceMiles}-mile journey.`
              : null,
          ]}
          updated={(page as { updated_at?: string | null }).updated_at ?? null}
        />
          ),
          details: [
            ...(entityName ? [{ icon: MapPin, label: "Location", value: entityName }] : []),
          ],
        }}
      />

      {/* Bands sit directly in <main> so the shared white / cream rhythm applies. */}
      {fares && fares.fares.length > 0 && (
        <PageBand ariaLabel="Fixed fares">
          <RouteFareTable data={fares} routeName={page.h1.replace(/\s+—.*$/, "")} />
        </PageBand>
      )}
      <SectionBands sections={allSections} />
      {appendix}

      <LocalMapSection focus={mapFocus} />
      <RelatedLinks center={mapFocus ? { lat: mapFocus.lat, lng: mapFocus.lng } : null} />
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

const LINK_TYPES = new Set(["popular_destinations", "nearby_airports", "nearby_cities", "service_grid"]);

/**
 * CMS sections grouped into page bands: prose sections share one editorial
 * band, link sections one card band, and FAQs the shared FAQ band.
 */
function SectionBands({ sections }: { sections: PublicSeoSection[] }) {
  const items = (s: PublicSeoSection) => {
    const p = (s.structured_payload || {}) as { items?: unknown };
    return Array.isArray(p.items) ? (p.items as any[]) : [];
  };
  const prose = sections.filter((s) => s.section_type !== "faqs" && !LINK_TYPES.has(s.section_type) && s.body);
  const links = sections.filter((s) => LINK_TYPES.has(s.section_type) && items(s).length > 0);
  const faqs = sections.filter((s) => s.section_type === "faqs").flatMap((s) =>
    items(s).map((it: any) => ({ q: String(it.question ?? ""), a: String(it.answer ?? "") })).filter((f) => f.q && f.a),
  );
  return (
    <>
      {prose.length > 0 && (
        <PageBand ariaLabel="About this journey">
          <EditorialRows
            items={prose.map((s, i) => ({
              heading: s.heading || (i === 0 ? "Overview" : "More information"),
              paragraphs: (s.body ?? "").split(/\n{2,}/).filter(Boolean),
            }))}
          />
        </PageBand>
      )}
      {links.length > 0 && (
        <PageBand eyebrow="Plan your journey" title="Nearby airports, routes and services">
          <div className={`grid gap-10 ${links.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {links.map((s) => (
              <div key={s.id}>
                <GroupLabel>{s.heading ?? "Related pages"}</GroupLabel>
                <LinkCards
                  columns={links.length > 1 ? 1 : 3}
                  links={items(s).filter((it: any) => it.href).map((it: any) => ({ href: it.href, label: it.label, sublabel: it.description || undefined }))}
                />
              </div>
            ))}
          </div>
        </PageBand>
      )}
      <FaqBand items={faqs} />
    </>
  );
}
export { buildSeoHead } from "@/components/seo/SeoPageRenderer.head";
