/**
 * Booking-page journey map: pickup → any stops → dropoff, drawn from the
 * server-computed driving polyline (browser key is Maps-JS only, so the route
 * geometry never comes from a client-side Directions call).
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Loader2 } from "lucide-react";

import { getJourneyMap } from "@/lib/journey-map.functions";
import { decodePolyline } from "@/lib/polyline";
import { loadGoogleMaps, onMapsAuthFailure } from "@/lib/maps-loader";

type Props = {
  pickupPlaceId?: string;
  dropoffPlaceId?: string;
  stopPlaceIds?: string[];
  className?: string;
};

export function JourneyMap({ pickupPlaceId, dropoffPlaceId, stopPlaceIds = [], className = "" }: Props) {
  const fetchMap = useServerFn(getJourneyMap);
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const drawnRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const enabled = !!pickupPlaceId && !!dropoffPlaceId && pickupPlaceId !== dropoffPlaceId;
  const stopsKey = stopPlaceIds.join("|");

  const q = useQuery({
    queryKey: ["journey-map", pickupPlaceId, dropoffPlaceId, stopsKey],
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: () =>
      fetchMap({
        data: {
          pickupPlaceId: pickupPlaceId!,
          dropoffPlaceId: dropoffPlaceId!,
          stopPlaceIds: stopPlaceIds,
        },
      }),
  });

  // Load the Maps script once the section is actually rendered.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const off = onMapsAuthFailure(() => alive && setFailed("Map could not be displayed."));
    loadGoogleMaps()
      .then(() => alive && setReady(true))
      .catch((err: Error) => alive && setFailed(err.message));
    return () => { alive = false; off(); };
  }, [enabled]);

  // Draw / redraw the route whenever the data or script availability changes.
  useEffect(() => {
    if (!ready || !q.data || !holder.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(holder.current, {
        zoom: 8,
        center: { lat: 55.9533, lng: -3.1883 },
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        clickableIcons: false,
      });
    }
    const map = mapRef.current;

    for (const item of drawnRef.current) item.setMap?.(null);
    drawnRef.current = [];

    const path = decodePolyline(q.data.polyline);
    if (!path.length) return;

    const casing = new g.maps.Polyline({
      path, map, strokeColor: "#0e182c", strokeOpacity: 0.9, strokeWeight: 7, zIndex: 1,
    });
    const line = new g.maps.Polyline({
      path, map, strokeColor: "#deae25", strokeOpacity: 1, strokeWeight: 3.5, zIndex: 2,
    });
    drawnRef.current.push(casing, line);

    const pts = q.data.points.length >= 2 ? q.data.points : [path[0]!, path[path.length - 1]!];
    pts.forEach((p, i) => {
      const isFirst = i === 0;
      const isLast = i === pts.length - 1;
      const marker = new g.maps.Marker({
        map,
        position: p,
        title: isFirst ? "Pickup" : isLast ? "Dropoff" : `Stop ${i}`,
        zIndex: 3 + i,
        label: isFirst || isLast ? undefined : { text: String(i), color: "#0e182c", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: isFirst || isLast ? 8 : 9,
          fillColor: isFirst ? "#deae25" : isLast ? "#0e182c" : "#f3d689",
          fillOpacity: 1,
          strokeColor: isFirst ? "#0e182c" : isLast ? "#deae25" : "#0e182c",
          strokeWeight: 2.5,
        },
      });
      drawnRef.current.push(marker);
    });

    const bounds = new g.maps.LatLngBounds();
    for (const p of path) bounds.extend(p);
    map.fitBounds(bounds, { top: 28, right: 28, bottom: 28, left: 28 });
  }, [ready, q.data]);

  if (!enabled) return null;

  const error = failed ?? (q.isError ? (q.error as Error).message : null);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-[var(--surface)] ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/70 bg-card">
        <MapPin className="size-3.5 text-[var(--gold-ink)]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Route map{stopPlaceIds.length ? ` · ${stopPlaceIds.length} stop${stopPlaceIds.length > 1 ? "s" : ""}` : ""}
        </p>
      </div>
      <div className="relative h-56 sm:h-64">
        <div ref={holder} className="absolute inset-0" aria-label="Journey route map" role="img" />
        {(!ready || q.isLoading) && !error && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-[var(--surface)]">
            <Loader2 className="size-4 animate-spin text-[var(--gold-ink)]" /> Loading route map…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-muted-foreground bg-[var(--surface)]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
