/**
 * Shared map band for local pages: the page's own coordinates, drawn after the
 * page content and above the footer — never inside the navy hero, and never
 * from a client-side geocode.
 */
import { PlaceMarkerMap } from "@/components/site/JourneyMap";

export type MapFocus = { lat: number; lng: number; label: string };

export function LocalMapSection({
  focus,
  heading,
}: {
  focus: MapFocus | null;
  /** Defaults to "<place> and surrounding area". */
  heading?: string;
}) {
  if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return null;
  return (
    <section className="section-y" aria-label={`${focus.label} and surrounding area`}>
      <div className="container-x">
        <h2 className="mb-6 font-display text-2xl font-semibold text-foreground">
          {heading ?? `${focus.label} and surrounding area`}
        </h2>
        <PlaceMarkerMap lat={focus.lat} lng={focus.lng} label={focus.label} />
      </div>
    </section>
  );
}
