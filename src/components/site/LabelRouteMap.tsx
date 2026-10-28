import { useEffect, useState } from "react";
import { JourneyMap } from "@/components/site/JourneyMap";
import { resolvePlaceText } from "@/lib/places.functions";

/** Driving-route map from two place names, resolved to Place IDs in the browser. */
export function LabelRouteMap({ from, to, className = "" }: { from: string; to: string; className?: string }) {
  const [ids, setIds] = useState<{ a?: string; b?: string }>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          resolvePlaceText({ data: { input: from } }),
          resolvePlaceText({ data: { input: to } }),
        ]);
        if (alive) setIds({ a: a?.place?.placeId, b: b?.place?.placeId });
      } catch {
        // Leave the map empty; the page content still stands on its own.
      }
    })();
    return () => {
      alive = false;
    };
  }, [from, to]);
  if (!ids.a || !ids.b) return null;
  return <JourneyMap pickupPlaceId={ids.a} dropoffPlaceId={ids.b} className={className} />;
}
