/**
 * Best-order planning for tour stops (browser-safe, no network).
 *
 * Locked stops never move. Free stops are only reordered inside the stretch
 * between the locked stops (or the start/finish) that surround them, so the
 * start, the finish and every locked stop keep their place.
 */
export type OrderableStop = { placeId: string; locked?: boolean };

export type OrderSegment = {
  /** Index of the locked stop the stretch starts at, or -1 for the tour start. */
  from: number;
  /** Index of the locked stop the stretch ends at, or stops.length for the finish. */
  to: number;
  /** Indices of the free stops inside this stretch, in their current order. */
  free: number[];
};

export function orderSegments(stops: OrderableStop[]): OrderSegment[] {
  const segments: OrderSegment[] = [];
  let from = -1;
  let free: number[] = [];
  stops.forEach((s, i) => {
    if (s.locked) {
      segments.push({ from, to: i, free });
      from = i;
      free = [];
    } else {
      free.push(i);
    }
  });
  segments.push({ from, to: stops.length, free });
  return segments;
}

/** Stretches with at least two free stops are the only ones worth reordering. */
export function segmentsToOptimise(stops: OrderableStop[]): OrderSegment[] {
  return orderSegments(stops).filter((s) => s.free.length >= 2);
}

/**
 * Apply each stretch's new order. `orders[k]` is a permutation of
 * 0..segment.free.length-1 for the k-th segment from segmentsToOptimise.
 */
export function applySegmentOrders<T extends OrderableStop>(
  stops: T[],
  segments: OrderSegment[],
  orders: number[][],
): T[] {
  const next = stops.slice();
  segments.forEach((seg, k) => {
    const order = orders[k];
    if (!order || order.length !== seg.free.length) return;
    const sorted = [...order].sort((a, b) => a - b);
    if (sorted.some((v, i) => v !== i)) return; // not a permutation: keep as is
    order.forEach((src, dst) => {
      next[seg.free[dst]!] = stops[seg.free[src]!]!;
    });
  });
  return next;
}

export function sameOrder(a: OrderableStop[], b: OrderableStop[]): boolean {
  return a.length === b.length && a.every((s, i) => s.placeId === b[i]!.placeId);
}

/** Move one stop to a new position (drag and drop, or arrows). Locked stops stay put. */
export function moveStop<T extends OrderableStop>(stops: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= stops.length || to >= stops.length) return stops;
  if (stops[from]!.locked || stops[to]!.locked) return stops;
  const next = stops.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
