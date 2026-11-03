/**
 * One capacity rule for the fleet page and the booking engine.
 *
 * The fleet page shows a class's passengers, large bags and cabin bags; the
 * booking engine checks requests against exactly those three numbers (times
 * the number of vehicles), so what a customer reads is what booking allows.
 */
export type ClassCapacityRow = {
  passengers: number | null;
  large_luggage: number | null;
  cabin_bags: number | null;
  hand_luggage?: number | null;
};

export type Capacity = { passengers: number; luggage: number; hand_luggage: number };

export function classCapacity(c: ClassCapacityRow): Capacity {
  return {
    passengers: Number(c.passengers ?? 0),
    luggage: Number(c.large_luggage ?? 0),
    // Cabin bags are the hand luggage carried inside; the legacy
    // `hand_luggage` column is only a fallback when cabin bags are unset.
    hand_luggage: Number(c.cabin_bags ?? 0) || Number(c.hand_luggage ?? 0),
  };
}

export function vehicleFits(
  cap: Capacity,
  qty: number,
  req: { passengers: number; luggage: number; handLuggage: number },
): boolean {
  const n = Math.max(1, qty);
  return (
    cap.passengers * n >= req.passengers &&
    cap.luggage * n >= req.luggage &&
    (cap.hand_luggage <= 0 || cap.hand_luggage * n >= req.handLuggage)
  );
}
