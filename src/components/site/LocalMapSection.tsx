/**
 * Shared map band for local pages: the page's own coordinates, drawn after the
 * page content and above the footer — never inside the navy hero, and never
 * from a client-side geocode.
 */
import { PlaceMarkerMap } from "@/components/site/JourneyMap";
import { PageBand } from "@/components/site/PageBand";

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
    <PageBand eyebrow="Map" title={heading ?? `${focus.label} and surrounding area`}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
        <PlaceMarkerMap lat={focus.lat} lng={focus.lng} label={focus.label} />
      </div>
    </PageBand>
  );
}
