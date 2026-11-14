import { resolveExtra, type ExtrasCatalogue } from "@/lib/extras-pricing";
import { TOO_MANY_SEATS } from "@/lib/child-seats";

export type DayExtraChoice = { key: string; quantity: number };

/** Resolve once per booking, from the vehicle's actual catalogue overrides. */
export function priceDayExtras(catalogue: ExtrasCatalogue, selected: DayExtraChoice[], classId: string, passengers: number, taxRate = 0, taxMode = "inclusive") {
  const seen = new Set<string>();
  let seatCount = 0;
  const choices = selected.filter((s) => s.quantity > 0).map((s) => {
    if (seen.has(s.key)) throw new Error("Choose each extra only once.");
    seen.add(s.key);
    const entry = catalogue.find((e) => e.key === s.key && e.active);
    const resolved = resolveExtra(catalogue, s.key, classId, 0);
    if (!entry || !resolved.available) throw new Error("An extra is no longer available for this vehicle. Please choose your extras again.");
    if (!Number.isInteger(s.quantity) || s.quantity > (resolved.maxQuantity ?? 1)) throw new Error("An extra exceeds this vehicle's limit.");
    const isSeat = entry.category === "child_seat" || entry.key === "child_seat";
    if (isSeat) seatCount += s.quantity;
    const units = entry.price_basis === "per_booking" ? 1 : s.quantity;
    const net = resolved.pence * units / 100;
    const amount = Math.round(net * (taxMode === "inclusive" ? 1 : 1 + taxRate) * 100) / 100;
    return { key: entry.key, name: entry.name ?? entry.key, quantity: s.quantity, amount, category: entry.category };
  });
  if (seatCount > passengers) throw new Error(TOO_MANY_SEATS);
  return { choices, seatCount, lines: choices.map((e) => ({ label: `${e.quantity} × ${e.name}`, amount: e.amount })) };
}