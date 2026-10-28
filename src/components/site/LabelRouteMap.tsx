/** Driving-route map between two place names (keyless Google Maps embed). */
export function LabelRouteMap({ from, to, className = "" }: { from: string; to: string; className?: string }) {
  const src = `https://maps.google.com/maps?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}&output=embed`;
  return (
    <iframe
      title={`Route map from ${from} to ${to}`}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`block h-full min-h-[280px] w-full border-0 ${className}`}
    />
  );
}
