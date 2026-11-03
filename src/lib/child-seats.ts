/** Child seats chosen on a booking, one row per seat type (priced per seat). */
export type ChildSeatChoice = { key: string; name: string; quantity: number };

export function parseChildSeats(raw: unknown): ChildSeatChoice[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const o = r as Record<string, unknown>;
    const quantity = Math.floor(Number(o?.quantity ?? 0));
    if (typeof o?.key !== "string" || typeof o?.name !== "string" || !(quantity > 0)) return [];
    return [{ key: o.key, name: o.name, quantity }];
  });
}

/** "2 × Toddler Child Seat, 1 × High-Back Booster"; falls back to the total for older bookings. */
export function childSeatsLabel(types: ChildSeatChoice[], total: number): string | null {
  if (types.length > 0) return types.map((t) => `${t.quantity} × ${t.name}`).join(", ");
  if (total > 0) return `${total} child seat${total === 1 ? "" : "s"}`;
  return null;
}

/** Seat choices from the selected extras, using catalogue names; quantities capped per type. */
export function childSeatChoices(
  selected: Array<{ key: string; quantity: number }>,
  catalogue: Array<{ key: string; name: string; category?: string | null; active?: boolean; max_quantity?: number }>,
): ChildSeatChoice[] {
  const out: ChildSeatChoice[] = [];
  for (const sel of selected) {
    const entry = catalogue.find((e) => e.key === sel.key && (e.category === "child_seat" || e.key === "child_seat") && e.active !== false);
    if (!entry) continue;
    const quantity = Math.min(Math.max(0, Math.floor(sel.quantity)), entry.max_quantity ?? sel.quantity);
    if (quantity > 0) out.push({ key: entry.key, name: entry.name, quantity });
  }
  return out;
}

export const TOO_MANY_SEATS = "You've chosen more child seats than passengers. Please reduce the child seats or add passengers.";
