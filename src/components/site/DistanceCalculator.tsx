import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LocationAutocomplete, type SelectedPlace } from "./LocationAutocomplete";
import { calculateRouteDistance, type RouteDistanceResult } from "@/lib/route-distance.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpDown, Loader2, Route } from "lucide-react";

function formatDuration(seconds: number) {
  if (!seconds) return "";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function DistanceCalculator() {
  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dest, setDest] = useState<SelectedPlace | null>(null);
  const [result, setResult] = useState<RouteDistanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const call = useServerFn(calculateRouteDistance);

  const ready = !!pickup?.placeId && !!dest?.placeId;

  function updatePickup(p: SelectedPlace | null) {
    setPickup(p); setResult(null); setError(null);
  }
  function updateDest(p: SelectedPlace | null) {
    setDest(p); setResult(null); setError(null);
  }
  function swap() {
    setPickup(dest); setDest(pickup); setResult(null); setError(null);
  }

  async function calculate() {
    if (!ready || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await call({ data: { pickupPlaceId: pickup!.placeId, destinationPlaceId: dest!.placeId } });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Distance calculation is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 md:p-7 space-y-5">
      <div className="space-y-4">
        <LocationAutocomplete
          label="Pickup location"
          placeholder="Enter pickup location"
          value={pickup}
          onChange={updatePickup}
        />
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="icon" onClick={swap} aria-label="Swap locations">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
        <LocationAutocomplete
          label="Destination location"
          placeholder="Enter destination location"
          value={dest}
          onChange={updateDest}
        />
      </div>

      <Button className="w-full" size="lg" disabled={!ready || loading} onClick={calculate}>
        {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating route...</>) : "Calculate distance"}
      </Button>

      {!ready && (pickup || dest) && (
        <p className="text-xs text-muted-foreground text-center">
          Please select both locations from the suggestions.
        </p>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
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
