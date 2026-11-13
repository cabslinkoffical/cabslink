import { coverPromise } from "@/lib/cancellation-cover";
import type { ComponentType, ReactNode } from "react";
import { BadgeCheck, Phone } from "lucide-react";
import { FACT_TEXT } from "@/lib/site-facts";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { BookingWidget } from "@/components/site/BookingWidget";
import { SITE } from "@/lib/site";
import { useRouterState } from "@tanstack/react-router";
import { pageImageFor } from "@/content/page-images";

export type LocalPageFact = { label: string; value: string };

export type LocalIntroDetail = {
  icon?: ComponentType<{ className?: string }>;
  label?: string;
  value: string;
  note?: string;
};

/** Introduction shown beside the page photo: paragraph first, key details below it. */
export type LocalIntro = {
  eyebrow?: string;
  heading: string;
  body: ReactNode;
  details?: LocalIntroDetail[];
  /** Extra content under the details, e.g. links. */
  footer?: ReactNode;
};

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
  image: imageProp = null,
  imageAlt: imageAltProp,
  imageCaption,
  intro,
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
  /** Paragraph + details rendered to the left of the page photo. */
  intro?: LocalIntro;
  children?: ReactNode;
}) {
  // Every local page shows its own registered photograph; the template's
  // image is only a fallback for pages that have none yet.
  const path = useRouterState({ select: (st) => st.location.pathname });
  const own = pageImageFor(path);
  const image = own?.src ?? imageProp;
  const imageAlt = own?.alt ?? imageAltProp;
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
              <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="page-hero-phone">
                <span className="page-hero-phone-icon"><Phone className="size-4" /></span>
                <span className="text-left text-sm">
                  <span className="block text-[10px] uppercase tracking-[0.24em] text-[var(--navy-foreground)]/70">Call us 24/7</span>
                  <span className="font-semibold">{SITE.phoneUK}</span>
                </span>
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
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[var(--navy-foreground)]">
              <BadgeCheck className="size-4 shrink-0 text-[var(--gold)]" aria-hidden />
              {FACT_TEXT.feesIncludedShort}
            </p>
            <div className="mt-3 text-xs text-[var(--navy-foreground)]" aria-label="What's included">
              <p className="font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">What's included</p>
              <ul className="mt-1 space-y-1">
                <li className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0 text-[var(--gold)]" aria-hidden />60 minutes free waiting from actual landing (airport pickups with a flight number)</li>
                <li className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0 text-[var(--gold)]" aria-hidden />{coverPromise("standard")} (standard cover)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {intro ? (
        <section className="local-intro" aria-labelledby="local-intro-heading">
          <div className="container-x local-intro-grid">
            <div className="local-intro-copy min-w-0">
              {intro.eyebrow && <p className="local-intro-eyebrow">{intro.eyebrow}</p>}
              <h2 id="local-intro-heading" className="local-intro-heading font-display">{intro.heading}</h2>
              <div className="local-intro-body speakable">{intro.body}</div>
              {intro.details && intro.details.length > 0 && (
                <ul className="local-intro-details">
                  {intro.details.map((f) => (
                    <li key={`${f.label ?? ""}-${f.value}`}>
                      {f.icon && <f.icon className="size-5 text-[var(--gold-ink)]" />}
                      {f.label && <span className="local-intro-detail-label">{f.label}</span>}
                      <strong className="local-intro-detail-value">{f.value}</strong>
                      {f.note && <span className="local-intro-detail-note">{f.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {intro.footer}
            </div>
            {image && (
              <figure className="local-intro-image">
                <img src={image} alt={imageAlt ?? title} width={1200} height={own ? 800 : 900} loading="eager" fetchPriority="high" />
                {imageCaption && <figcaption>{imageCaption}</figcaption>}
              </figure>
            )}
          </div>
        </section>
      ) : image ? (
        <div className="container-x">
          <figure className="local-hero-image-band">
            <img src={image} alt={imageAlt ?? title} width={1600} height={640} loading="eager" />
            {imageCaption && <figcaption>{imageCaption}</figcaption>}
          </figure>
        </div>
      ) : null}
    </>
  );
}
