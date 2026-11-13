/**
 * One shared query for a tour's driving route: the map draws its line and the
 * booking itinerary reads the miles and minutes of each leg from the same
 * answer, so the numbers beside each stop always match the drawn route.
 */
import { queryOptions } from "@tanstack/react-query";
import { getTourLoopMap } from "@/lib/journey-map.functions";

export function tourLoopQuery(startPlaceId: string | undefined, stopPlaceIds: string[], endPlaceId?: string | null) {
  const end = endPlaceId && endPlaceId !== startPlaceId ? endPlaceId : null;
  return queryOptions({
    queryKey: ["tour-loop-map", startPlaceId ?? "", stopPlaceIds.join("|"), end ?? ""],
    enabled: !!startPlaceId && stopPlaceIds.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: () => getTourLoopMap({ data: { startPlaceId: startPlaceId!, stopPlaceIds, endPlaceId: end } }),
  });
}
