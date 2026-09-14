/**
 * Tour builder map: the loop from the pickup, round every chosen stop and back.
 *
 * Route geometry comes from the server (the browser key is Maps-JS only), and
 * before any stop is chosen we simply pin the pickup so the customer always has
 * their bearings.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";

import { getTourLoopMap } from "@/lib/journey-map.functions";
import { decodePolyline } from "@/lib/polyline";
import { loadGoogleMaps, onMapsAuthFailure } from "@/lib/maps-loader";

type Props = {
  startPlaceId?: string;
  startLabel?: string;
  stops: Array<{ placeId: string; name: string }>;
  /** Fallback centre when there are no stops yet and the pickup has no geometry. */
  className?: string;
};

const NAVY = "#0e182c";
const GOLD = "#deae25";

export function TourLoopMap({ startPlaceId, startLabel, stops, className = "" }: Props) {
  const fetchLoop = useServerFn(getTourLoopMap);
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const drawnRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const stopIds = stops.map((s) => s.placeId);
  const stopsKey = stopIds.join("|");
  const enabled = !!startPlaceId;

  const q = useQuery({
    queryKey: ["tour-loop-map", startPlaceId, stopsKey],
    enabled: enabled && stopIds.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: () => fetchLoop({ data: { startPlaceId: startPlaceId!, stopPlaceIds: stopIds } }),
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const off = onMapsAuthFailure(() => alive && setFailed("Map could not be displayed."));
    loadGoogleMaps()
      .then(() => alive && setReady(true))
      .catch((err: Error) => alive && setFailed(err.message));
    return () => { alive = false; off(); };
  }, [enabled]);

  useEffect(() => {
    if (!ready || !holder.current) return;
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

    const bounds = new g.maps.LatLngBounds();
    const pin = (position: any, opts: { label?: string; title: string; start?: boolean }) => {
      const marker = new g.maps.Marker({
        map,
        position,
        title: opts.title,
        label: opts.label
          ? { text: opts.label, color: NAVY, fontSize: "11px", fontWeight: "700" }
          : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: opts.start ? 8 : 9,
          fillColor: opts.start ? GOLD : "#f3d689",
          fillOpacity: 1,
          strokeColor: NAVY,
          strokeWeight: 2.5,
        },
      });
      drawnRef.current.push(marker);
      bounds.extend(position);
    };

    if (q.data?.polyline) {
      const path = decodePolyline(q.data.polyline);
      if (path.length) {
        const casing = new g.maps.Polyline({
          path, map, strokeColor: NAVY, strokeOpacity: 0.9, strokeWeight: 7, zIndex: 1,
        });
        const line = new g.maps.Polyline({
          path, map, strokeColor: GOLD, strokeOpacity: 1, strokeWeight: 3.5, zIndex: 2,
        });
        drawnRef.current.push(casing, line);
        for (const p of path) bounds.extend(p);
      }
      const pts = q.data.points;
      pts.forEach((p, i) => {
        const isStart = i === 0 || i === pts.length - 1;
        pin(p, {
          title: isStart ? (startLabel ?? "Pickup and finish") : (stops[i - 1]?.name ?? `Stop ${i}`),
          label: isStart ? undefined : String(i),
          start: isStart,
        });
      });
      map.fitBounds(bounds, { top: 28, right: 28, bottom: 28, left: 28 });
      return;
    }

    // No stops yet — centre on the pickup so the map still means something.
    if (startPlaceId) {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ placeId: startPlaceId }, (res: any[], status: string) => {
        if (status !== "OK" || !res?.[0]) return;
        const loc = res[0].geometry.location;
        pin(loc, { title: startLabel ?? "Pickup and finish", start: true });
        map.setCenter(loc);
        map.setZoom(11);
      });
    }
  }, [ready, q.data, startPlaceId, startLabel, stopsKey]);

  if (!enabled) return null;
  const error = failed ?? (q.isError ? (q.error as Error).message : null);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-[var(--surface)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-border/70 bg-card px-4 py-2.5">
        <MapPin className="size-3.5 text-[var(--gold-ink)]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Your day on the map
          {stops.length ? ` · ${stops.length} stop${stops.length > 1 ? "s" : ""}` : " · add a stop to see the route"}
        </p>
      </div>
      <div className="relative h-56 sm:h-72">
        <div ref={holder} className="absolute inset-0" aria-label="Tour route map" role="img" />
        {(!ready || q.isLoading) && !error && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--surface)] text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-[var(--gold-ink)]" /> Loading your map…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)] px-6 text-center text-xs text-muted-foreground">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
