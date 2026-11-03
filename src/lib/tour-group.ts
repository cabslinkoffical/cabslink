/**
 * Browser-safe rules for tours and hourly hire with more than one vehicle:
 * how a group is split between vehicles, which combinations to suggest, and
 * the label shown on the booking, emails and admin. The server re-runs the
 * split before pricing, and the database checks it again when reserving.
 */

export const MAX_GROUP_VEHICLES = 6;

export type GroupClass = {
  id: string;
  name: string;
  max_passengers: number | null;
  max_luggage: number | null;
  /** Used only to rank suggestions; never to price. */
  hourly_rate?: number | null;
};

export type VehicleShare = { vehicleClassId: string; passengers: number; luggage: number };

export type SplitResult = { ok: true; shares: VehicleShare[] } | { ok: false; reason: string };

const seats = (c: GroupClass) => Math.max(0, Number(c.max_passengers ?? 0));
const cases = (c: GroupClass) => Math.max(0, Number(c.max_luggage ?? 0));

/**
 * Shares passengers and suitcases between the chosen vehicles in the order
 * given: every vehicle carries at least one passenger, then each is filled
 * up to its seats and luggage space.
 */
export function splitGroup(vehicleIds: string[], classes: GroupClass[], passengers: number, luggage: number): SplitResult {
  if (vehicleIds.length === 0) return { ok: false, reason: "Choose a vehicle." };
  if (vehicleIds.length > MAX_GROUP_VEHICLES) return { ok: false, reason: `Please call us to book more than ${MAX_GROUP_VEHICLES} vehicles.` };
  const byId = new Map(classes.map((c) => [c.id, c]));
  const list = vehicleIds.map((id) => byId.get(id));
  if (list.some((c) => !c)) return { ok: false, reason: "Choose an available vehicle." };
  const vs = list as GroupClass[];
  if (passengers < vs.length) return { ok: false, reason: "Each vehicle needs at least one passenger. Remove a vehicle." };
  const totalSeats = vs.reduce((s, c) => s + seats(c), 0);
  const totalCases = vs.reduce((s, c) => s + cases(c), 0);
  if (totalSeats < passengers) return { ok: false, reason: `These vehicles seat ${totalSeats}. Add a vehicle for ${passengers} passengers.` };
  if (totalCases < luggage) return { ok: false, reason: `These vehicles take ${totalCases} suitcases. Add a vehicle for ${luggage} suitcases.` };
  if (vs.some((c) => seats(c) < 1)) return { ok: false, reason: "Choose an available vehicle." };

  const pax = vs.map(() => 1);
  let left = passengers - vs.length;
  vs.forEach((c, i) => { const add = Math.min(left, seats(c) - 1); pax[i] += add; left -= add; });
  const lug = vs.map(() => 0);
  let bags = luggage;
  vs.forEach((c, i) => { const add = Math.min(bags, cases(c)); lug[i] += add; bags -= add; });
  return { ok: true, shares: vs.map((c, i) => ({ vehicleClassId: c.id, passengers: pax[i]!, luggage: lug[i]! })) };
}

/** "2 × Executive Minibus + Saloon" — largest group first, in the order chosen. */
export function groupLabel(vehicleIds: string[], classes: Array<{ id: string; name: string }>): string {
  const names = new Map(classes.map((c) => [c.id, c.name]));
  const counts: Array<[string, number]> = [];
  for (const id of vehicleIds) {
    const hit = counts.find(([k]) => k === id);
    if (hit) hit[1] += 1; else counts.push([id, 1]);
  }
  return counts.map(([id, n]) => `${n > 1 ? `${n} × ` : ""}${names.get(id) ?? "Vehicle"}`).join(" + ");
}

/**
 * Up to `limit` combinations of one or two vehicle types that carry the whole
 * group: fewest vehicles first, then the lowest hourly cost, then the fewest
 * empty seats. Larger vehicles are listed first in each combination.
 */
export function suggestGroups(classes: GroupClass[], passengers: number, luggage: number, limit = 3): string[][] {
  const usable = classes.filter((c) => seats(c) > 0);
  const found: Array<{ ids: string[]; n: number; cost: number; spare: number }> = [];
  const consider = (parts: Array<[GroupClass, number]>) => {
    const n = parts.reduce((s, [, k]) => s + k, 0);
    if (n < 1 || n > MAX_GROUP_VEHICLES || n > passengers) return;
    const s = parts.reduce((t, [c, k]) => t + seats(c) * k, 0);
    const b = parts.reduce((t, [c, k]) => t + cases(c) * k, 0);
    if (s < passengers || b < luggage) return;
    const ids = parts
      .slice()
      .sort((x, y) => seats(y[0]) - seats(x[0]))
      .flatMap(([c, k]) => Array.from({ length: k }, () => c.id));
    const cost = parts.reduce((t, [c, k]) => t + Number(c.hourly_rate ?? 0) * k, 0);
    found.push({ ids, n, cost, spare: s - passengers });
  };
  for (let i = 0; i < usable.length; i++) {
    for (let a = 1; a <= MAX_GROUP_VEHICLES; a++) {
      consider([[usable[i]!, a]]);
      for (let j = i + 1; j < usable.length; j++) {
        for (let b = 1; a + b <= MAX_GROUP_VEHICLES; b++) consider([[usable[i]!, a], [usable[j]!, b]]);
      }
    }
  }
  found.sort((x, y) => x.n - y.n || x.cost - y.cost || x.spare - y.spare);
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const f of found) {
    const key = f.ids.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f.ids);
    if (out.length >= limit) break;
  }
  return out;
}
