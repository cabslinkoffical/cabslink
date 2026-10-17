import { PlaceMarkerMap } from "@/components/site/JourneyMap";

export function AirportMapSection({ focus }: {
  focus: { lat: number; lng: number; label: string } | null;
}) {
  if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return null;
  return (
    <section className="section-y" aria-label={`${focus.label} and surrounding area`}>
      <div className="container-x">
        <h2 className="mb-6 font-display text-2xl font-semibold text-foreground">{focus.label} and surrounding area</h2>
        <PlaceMarkerMap lat={focus.lat} lng={focus.lng} label={focus.label} />
      </div>
    </section>
  );
}