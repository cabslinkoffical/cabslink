import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { BookingWidget } from "@/components/site/BookingWidget";
import { SITE } from "@/lib/site";

export type LocalPageFact = { label: string; value: string };

/**
 * The one hero pattern for every local page (routes, airports, stations,
 * towns, areas, service+location pages). Page-specific copy and facts on the
 * left; the identical booking form in the same place on the right, prefilled
 * with the page's own pickup/drop-off; a relevant image band underneath.
 * Only the data changes between pages — never the pattern.
 */
export function LocalPageHero({
  breadcrumbs,
  eyebrow,
  title,
  titleAccent,
  subtitle,
  facts = [],
  prefill,
  mapFocus = null,
  showMap = false,
  image = null,
  imageAlt,
  imageCaption,
  children,
}: {
  breadcrumbs: Crumb[];
  eyebrow?: string;
  title: string;
  /** Gold-accented tail of the title, e.g. "transfers". */
  titleAccent?: string;
  subtitle?: ReactNode;
  facts?: LocalPageFact[];
  prefill?: { pickup?: string; dropoff?: string };
  mapFocus?: { lat: number; lng: number; label: string } | null;
  showMap?: boolean;
  image?: string | null;
  imageAlt?: string;
  imageCaption?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <section className="local-hero relative z-20 navy-scene text-navy-foreground">
        <div className="container-x local-hero-grid">
          <div className="local-hero-copy min-w-0">
            <Breadcrumbs items={breadcrumbs} dark />
            {eyebrow && <p className="local-hero-eyebrow">{eyebrow}</p>}
            <h1 className="local-hero-title font-display">
              {title}
              {titleAccent && (
                <>
                  {" "}
                  <span className="text-[var(--gold)]">{titleAccent}</span>
                </>
              )}
            </h1>
            {subtitle && <p className="local-hero-subtitle">{subtitle}</p>}
            {facts.length > 0 && (
              <ul className="local-hero-facts">
                {facts.map((f) => (
                  <li key={`${f.label}-${f.value}`}>
                    <span>{f.label}</span>
                    <strong>{f.value}</strong>
                  </li>
                ))}
              </ul>
            )}
            <div className="local-hero-actions">
              <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="local-hero-phone">
                <Phone className="size-4" /> {SITE.phoneUK}
              </a>
            </div>
            {children}
          </div>
          <div id="booking" className="local-hero-booking relative z-50 min-w-0 scroll-mt-24">
            <BookingWidget
              variant="hero"
              initialPickupLabel={prefill?.pickup}
              initialDropoffLabel={prefill?.dropoff}
              mapFocus={mapFocus}
              showMap={showMap}
            />
          </div>
        </div>
      </section>
      {image && (
        <div className="container-x">
          <figure className="local-hero-image-band">
            <img src={image} alt={imageAlt ?? title} width={1600} height={640} loading="eager" />
            {imageCaption && <figcaption>{imageCaption}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}
