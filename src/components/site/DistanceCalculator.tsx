import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PlaceAutocomplete, type SelectedPlace } from "./PlaceAutocomplete";
import { calculateRouteDistance, type RouteDistanceResult } from "@/lib/route-distance.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, Loader2, Route, RefreshCw } from "lucide-react";

function formatDuration(seconds: number) {
  if (!seconds) return "";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function isRetryable(msg: string) {
  return /temporarily unavailable|timed out|too many requests/i.test(msg);
}

export function DistanceCalculator() {
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dest, setDest] = useState<SelectedPlace | null>(null);
  const [result, setResult] = useState<RouteDistanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const call = useServerFn(calculateRouteDistance);
  const inflight = useRef(false);

  const ready = !!pickup?.placeId && !!dest?.placeId;
  const sameLocation = ready && pickup!.placeId === dest!.placeId;

  function updatePickup(p: SelectedPlace | null) { setPickup(p); setResult(null); setError(null); }
  function updateDest(p: SelectedPlace | null) { setDest(p); setResult(null); setError(null); }
  function swap() { setPickup(dest); setDest(pickup); setResult(null); setError(null); }

  async function calculate() {
    if (!ready || loading || inflight.current || sameLocation) return;
    inflight.current = true;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await call({ data: { pickupPlaceId: pickup!.placeId, destinationPlaceId: dest!.placeId } });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Distance calculation is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }

  return (
    <Card className="p-5 md:p-7 space-y-5">
      <div className="space-y-4">
        <div>
          <Label htmlFor="dc-pickup" className="text-sm font-medium">Pickup location</Label>
          <div className="mt-1.5">
            <PlaceAutocomplete
              id="dc-pickup"
              value={pickup}
              onChange={updatePickup}
              placeholder="Enter pickup location"
              inputClassName="pl-9"
              iconClassName="left-3"
              hideAttribution
            />
          </div>
        </div>
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="icon" onClick={swap} aria-label="Swap locations">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <Label htmlFor="dc-dest" className="text-sm font-medium">Destination location</Label>
          <div className="mt-1.5">
            <PlaceAutocomplete
              id="dc-dest"
              value={dest}
              onChange={updateDest}
              placeholder="Enter destination location"
              inputClassName="pl-9"
              iconClassName="left-3"
              hideAttribution
            />
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" disabled={!ready || loading || sameLocation} onClick={calculate} aria-busy={loading}>
        {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating route...</>) : "Calculate distance"}
      </Button>

      {sameLocation && (
        <p className="text-xs text-destructive text-center">Pickup and destination cannot be the same location.</p>
      )}
      {!ready && (pickup || dest) && !sameLocation && (
        <p className="text-xs text-muted-foreground text-center">Please select both locations from the suggestions.</p>
      )}
      <p className="text-[10px] text-muted-foreground text-right">Powered by Google</p>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start justify-between gap-3">
          <span>{error}</span>
          {isRetryable(error) && (
            <Button size="sm" variant="outline" onClick={calculate} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}

      {result && <DistanceResult result={result} formatDuration={formatDuration} />}
    </Card>
  );
}

function DistanceResult({ result, formatDuration }: { result: RouteDistanceResult; formatDuration: (s: number) => string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-6 text-center">
      <Route className="mx-auto mb-2 h-5 w-5 text-primary" />
      <div className="text-4xl font-bold tracking-tight">{result.distanceMiles.toFixed(2)} miles</div>
      <div className="mt-1 text-sm text-muted-foreground">Estimated driving distance</div>
      {result.durationSeconds > 0 && (
        <div className="mt-3 text-sm">
          <span className="text-muted-foreground">Estimated travel time: </span>
          <span className="font-medium">{formatDuration(result.durationSeconds)}</span>
        </div>
      )}
    </div>
  );
}
