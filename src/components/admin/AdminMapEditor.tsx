import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminResolvePlaceCoords, adminRouteGeometry } from "@/lib/admin-map.functions";
import { decodePolyline, milesToKm, milesToMetres } from "@/lib/polyline";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw, ArrowLeftRight, X, AlertTriangle } from "lucide-react";

/**
 * ONE reusable interactive map editor for every admin geo rule screen.
 *
 * - Maps JavaScript API (interactive; NOT the Embed API)
 * - Markers placed as soon as a Place is selected, live route drawn between
 *   start/end, live radius circle around the anchor
 * - Fits bounds to markers + route + circle, updates without reload
 * - Internal unit is MILES everywhere; km shown for reference only
 *
 * This component is a VISUAL PREVIEW. It performs no pricing arithmetic —
 * the authoritative server pricing/availability engine remains the only
 * source of truth.
 */

export type MapPoint = { placeId: string; label: string } | null;

type Props = {
  mode: "radius" | "route";
  origin: MapPoint;
  destination?: MapPoint;
  /** Radius in statute miles around the origin (both modes). */
  radiusMiles?: number | null;
  /** Radius in statute miles around the destination (mode="route"). */
  destinationRadiusMiles?: number | null;
  onClearOrigin?: () => void;
  onClearDestination?: () => void;
  onReverse?: () => void;
  /** Reports resolved coordinates so the parent can persist/validate them. */
  onCoords?: (c: {
    origin: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
  }) => void;
  /** Reports live route distance/duration so the parent can show a readonly field. */
  onRoute?: (r: { miles: number; minutes: number } | null) => void;
  className?: string;
  height?: number;
};

const UK_CENTER = { lat: 55.3781, lng: -3.4360 };

export function AdminMapEditor({
  mode,
  origin,
  destination = null,
  radiusMiles = null,
  onClearOrigin,
  onClearDestination,
  onReverse,
  onCoords,
  className,
  height = 320,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const originMarker = useRef<any>(null);
  const destMarker = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const lineRef = useRef<any>(null);

  const resolveCoordsFn = useServerFn(adminResolvePlaceCoords);
  const routeFn = useServerFn(adminRouteGeometry);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [originCoord, setOriginCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoord, setDestCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<{ miles: number; minutes: number; path: { lat: number; lng: number }[] } | null>(null);

  // ---- Load the shared Maps JS API instance --------------------------------
  useEffect(() => {
    let cancelled = false;
    import("@/lib/maps-loader")
      .then((m) => m.loadGoogleMaps())
      .then(() => {
        if (cancelled || !divRef.current) return;
        mapRef.current = new window.google.maps.Map(divRef.current, {
          center: UK_CENTER,
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Resolve Place IDs → coordinates ------------------------------------
  const ids = useMemo(
    () => [origin?.placeId, mode === "route" ? destination?.placeId : null].filter(Boolean) as string[],
    [origin?.placeId, destination?.placeId, mode],
  );
  const idsKey = ids.join("|");

  useEffect(() => {
    if (ids.length === 0) {
      setOriginCoord(null);
      setDestCoord(null);
      setRoute(null);
      onCoords?.({ origin: null, destination: null });
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError(null);
    resolveCoordsFn({ data: { placeIds: ids } })
      .then((res: any) => {
        if (cancelled) return;
        const find = (id?: string | null) => {
          if (!id) return null;
          const row = res.coords.find((c: any) => c.placeId === id);
          return row && row.lat != null && row.lng != null ? { lat: Number(row.lat), lng: Number(row.lng) } : null;
        };
        const o = find(origin?.placeId);
        const d = mode === "route" ? find(destination?.placeId) : null;
        setOriginCoord(o);
        setDestCoord(d);
        onCoords?.({ origin: o, destination: d });
        if (origin?.placeId && !o) setError("Could not resolve coordinates for the selected location.");
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? "Could not resolve coordinates."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // ---- Live route geometry (mode="route") ---------------------------------
  useEffect(() => {
    if (mode !== "route" || !origin?.placeId || !destination?.placeId) {
      setRoute(null);
      return;
    }
    if (origin.placeId === destination.placeId) {
      setRoute(null);
      setError("Start and end must be different locations.");
      return;
    }
    let cancelled = false;
    setBusy(true);
    routeFn({ data: { originPlaceId: origin.placeId, destinationPlaceId: destination.placeId } })
      .then((r: any) => {
        if (cancelled) return;
        setRoute({
          miles: Number(r.distanceMiles),
          minutes: Number(r.durationMinutes),
          path: r.encodedPolyline ? decodePolyline(r.encodedPolyline) : [],
        });
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? "Route preview unavailable."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, origin?.placeId, destination?.placeId]);

  // ---- Draw / redraw overlays --------------------------------------------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = window.google.maps;
    const map = mapRef.current;
    const bounds = new g.LatLngBounds();
    let hasBounds = false;

    const setMarker = (
      ref: React.MutableRefObject<any>,
      coord: { lat: number; lng: number } | null,
      label: string,
      colour: string,
      title: string,
    ) => {
      if (!coord) {
        ref.current?.setMap(null);
        ref.current = null;
        return;
      }
      if (!ref.current) {
        ref.current = new g.Marker({
          map,
          label: { text: label, color: "#0E182C", fontWeight: "700" },
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: colour,
            fillOpacity: 1,
            strokeColor: "#0E182C",
            strokeWeight: 2,
          },
        });
      }
      ref.current.setPosition(coord);
      ref.current.setTitle(title);
      bounds.extend(coord);
      hasBounds = true;
    };

    setMarker(originMarker, originCoord, "A", "#DEAE25", origin?.label ?? "Start");
    setMarker(destMarker, mode === "route" ? destCoord : null, "B", "#FFFFFF", destination?.label ?? "End");

    // Radius circle — the exact area the rule covers.
    const showCircle = mode === "radius" && originCoord && radiusMiles != null && radiusMiles > 0;
    if (showCircle) {
      if (!circleRef.current) {
        circleRef.current = new g.Circle({
          map,
          strokeColor: "#DEAE25",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#DEAE25",
          fillOpacity: 0.14,
        });
      }
      circleRef.current.setCenter(originCoord);
      circleRef.current.setRadius(milesToMetres(radiusMiles!));
      const cb = circleRef.current.getBounds();
      if (cb) {
        bounds.union(cb);
        hasBounds = true;
      }
    } else {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    }

    // Route polyline.
    if (mode === "route" && route?.path.length) {
      if (!lineRef.current) {
        lineRef.current = new g.Polyline({
          map,
          strokeColor: "#0E182C",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
      }
      lineRef.current.setPath(route.path);
      for (const p of route.path) bounds.extend(p);
      hasBounds = true;
    } else {
      lineRef.current?.setMap(null);
      lineRef.current = null;
    }

    if (hasBounds) {
      map.fitBounds(bounds, 48);
      if (!showCircle && !route?.path.length && originCoord && !destCoord) {
        map.setCenter(originCoord);
        map.setZoom(12);
      }
    } else {
      map.setCenter(UK_CENTER);
      map.setZoom(6);
    }
  }, [ready, originCoord, destCoord, radiusMiles, route, mode, origin?.label, destination?.label]);

  const missingCoords = !!origin?.placeId && !originCoord && !busy;

  return (
    <div className={className}>
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
        <div ref={divRef} style={{ height }} aria-label="Interactive coverage map" role="application" />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-muted/80 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading map…
            </span>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-0 bottom-0 flex items-start gap-2 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {busy && ready && (
          <div className="absolute top-2 right-2 rounded-md bg-background/90 px-2 py-1 text-xs flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Updating
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {origin?.placeId ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-primary" />
            <strong className="font-medium text-foreground">A</strong> {origin.label}
            {originCoord && (
              <span className="tabular-nums">
                ({originCoord.lat.toFixed(5)}, {originCoord.lng.toFixed(5)})
              </span>
            )}
          </span>
        ) : (
          <span>Select a location to preview coverage.</span>
        )}
        {mode === "route" && destination?.placeId && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            <strong className="font-medium text-foreground">B</strong> {destination.label}
            {destCoord && (
              <span className="tabular-nums">
                ({destCoord.lat.toFixed(5)}, {destCoord.lng.toFixed(5)})
              </span>
            )}
          </span>
        )}
        {mode === "route" && route && (
          <span className="tabular-nums">
            · {route.miles.toFixed(1)} mi · ~{route.minutes} min
          </span>
        )}
        {mode === "radius" && radiusMiles != null && radiusMiles > 0 && (
          <span className="tabular-nums">
            · covers {radiusMiles} mi radius ({milesToKm(radiusMiles)} km) from A
          </span>
        )}
      </div>

      {missingCoords && (
        <p className="mt-1 text-xs text-destructive">
          Coordinates missing for this Place ID — geographic matching will not work until it resolves.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {onClearOrigin && origin?.placeId && (
          <Button type="button" size="sm" variant="outline" onClick={onClearOrigin}>
            <X className="size-3.5 mr-1" /> Clear {mode === "route" ? "start" : "location"}
          </Button>
        )}
        {onClearDestination && destination?.placeId && (
          <Button type="button" size="sm" variant="outline" onClick={onClearDestination}>
            <X className="size-3.5 mr-1" /> Clear end
          </Button>
        )}
        {onReverse && origin?.placeId && destination?.placeId && (
          <Button type="button" size="sm" variant="outline" onClick={onReverse}>
            <ArrowLeftRight className="size-3.5 mr-1" /> Reverse direction
          </Button>
        )}
        {ready && (origin?.placeId || destination?.placeId) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setOriginCoord((c) => c);
              if (mapRef.current && originCoord) mapRef.current.panTo(originCoord);
            }}
          >
            <RefreshCw className="size-3.5 mr-1" /> Recentre
          </Button>
        )}
      </div>
    </div>
  );
}
