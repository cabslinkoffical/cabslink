/**
 * Renders the Section[] produced by the content engine as full-width page
 * bands: one "key facts" band (fact table + nearby links) and one FAQ band.
 * Nothing renders when its data is missing.
 */
import type React from "react";
import type { Section } from "@/lib/seo/content-engine";
import type { LoadedDestination } from "@/lib/destination-loader";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { PageBand, FactTable, LinkCards, GroupLabel, type FactRow } from "@/components/site/PageBand";
import { Button } from "@/components/ui/button";
import { MapPin, Route as RouteIcon, Briefcase } from "lucide-react";
import {
  nearbyLinks,
  popularRouteLinks,
  relatedServiceLinks,
} from "@/lib/internal-links";

const TYPE_LABEL: Record<string, string> = {
  airport: "Airport",
  station: "Train station",
  cruise_port: "Cruise port",
  university: "University",
  hospital: "Hospital",
  attraction: "Attraction",
  distillery: "Distillery",
  business_park: "Business park",
  city: "City",
  town: "Town",
  location: "Location",
  hotel: "Hotel",
  stadium: "Stadium",
  venue: "Venue",
};

function coords(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

/** Fact rows built only from the destination record and engine sections. */
export function destinationFactRows(sections: Section[], loaded: LoadedDestination): FactRow[] {
  const d = loaded.destination;
  const rows: FactRow[] = [];
  const seen = new Set<string>();
  const push = (label: string, value: string | null | undefined) => {
    if (!value || seen.has(label)) return;
    seen.add(label);
    rows.push({ label, value });
  };
  const keys = new Set(sections.map((s) => s.key));
  if (keys.has("facts") || keys.has("geo_context")) {
    push("Type", TYPE_LABEL[d.type] ?? d.type.replace(/_/g, " "));
    push("Town", d.town);
    push("Council area", d.council);
    push("Region", d.region);
    const geo = sections.find((s) => s.key === "geo_context");
    if (geo && geo.key === "geo_context") {
      const country = geo.parts.find((p) => p.label === "Country")?.value;
      push("Country", country === "GB" ? "United Kingdom" : country);
    }
  }
  for (const s of sections) {
    if (s.key === "airport_info" || s.key === "attraction_info") {
      for (const [k, v] of s.rows) push(k, v);
    }
    if (s.key === "route_action") {
      push("Route", `${s.from} → ${s.to}${s.distanceKm ? ` · approx. ${s.distanceKm} km` : ""}`);
    }
  }
  if (keys.has("facts") && typeof d.lat === "number" && typeof d.lng === "number") {
    push("Coordinates", coords(d.lat, d.lng));
  }
  return rows;
}

export function DestinationSections({
  sections,
  loaded,
  children,
}: {
  sections: Section[];
  loaded: LoadedDestination;
  /** Bands rendered between the key facts and the FAQs (e.g. the travel guide). */
  children?: React.ReactNode;
}) {
  const d = loaded.destination;
  const name = d.display_name ?? d.name;
  const rows = destinationFactRows(sections, loaded);
  const keys = new Set(sections.map((s) => s.key));
  const groups = [
    keys.has("nearby") ? { icon: MapPin, mod: nearbyLinks(loaded.nearby) } : null,
    keys.has("popular_routes") ? { icon: RouteIcon, mod: popularRouteLinks(loaded.popularRoutes) } : null,
    keys.has("related_services") ? { icon: Briefcase, mod: relatedServiceLinks(loaded.relatedServices) } : null,
  ].filter((g): g is NonNullable<typeof g> => !!g && g.mod.links.length > 0);
  const faq = sections.find((s) => s.key === "faq");
  const cta = sections.find((s) => s.key === "book_cta");

  return (
    <>
      {(rows.length > 0 || groups.length > 0) && (
        <PageBand eyebrow={name} title="Key facts and nearby places">
          <div className={`grid gap-10 ${rows.length && groups.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}`}>
            {rows.length > 0 && (
              <div className={groups.length ? "" : "max-w-3xl"}>
                <FactTable caption={`${name} at a glance`} rows={rows} itemType="https://schema.org/Place" />
              </div>
            )}
            {groups.length > 0 && (
              <div className="space-y-8">
                {groups.map((g) => (
                  <div key={g.mod.heading}>
                    <GroupLabel icon={g.icon}>{g.mod.heading}</GroupLabel>
                    <LinkCards links={g.mod.links} columns={rows.length ? 1 : 3} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageBand>
      )}

      {children}

      {faq && faq.key === "faq" && faq.items.length > 0 && (
        <PageBand id="faq" eyebrow="FAQs" title="Frequently asked questions" narrow>
          <FaqAccordion items={faq.items} />
          {cta && cta.key === "book_cta" && (
            <div className="mt-10">
              <Button asChild variant="gold" size="lg" className="rounded-lg">
                <a href={cta.href}>{cta.label}</a>
              </Button>
            </div>
          )}
        </PageBand>
      )}
    </>
  );
}
