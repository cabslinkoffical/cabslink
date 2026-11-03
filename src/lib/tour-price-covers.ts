/**
 * What a tour's "From" price covers. Browser-safe and pure: every value comes
 * from tour data (template hours/miles, the From vehicle's fixed price and
 * extra-hour rate, hour tiers). A value that isn't set stays null and its line
 * is left out — nothing is guessed.
 */

export type TourPriceCovers = {
  /** Hours with the driver included in the From price. */
  hours: number | null;
  /** Road miles included in the From price. */
  includedMiles: number | null;
  /** Cost of each extra hour for the From vehicle, in pence. */
  extraHourPence: number | null;
  /** True only when the tour's own "included" data mentions entry tickets. */
  ticketsIncluded: boolean;
};

type Tier = { hours: number; included_miles: number };

function pos(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Same rule as the quote engine's includedMilesFor: the smallest tier covering the hours. */
function tierMiles(hours: number, tiers: Tier[]): number | null {
  const sorted = [...tiers].sort((a, b) => a.hours - b.hours);
  const t = sorted.find((x) => x.hours >= hours) ?? sorted[sorted.length - 1];
  return t ? pos(t.included_miles) : null;
}

const TICKET_RE = /\b(tickets?|admission|entry fees?|entrance fees?)\b/i;

/** Entry tickets count as included only when the tour's included list or text says so. */
export function tourIncludesTickets(included: unknown, includedMd: unknown): boolean {
  const items = Array.isArray(included) ? included.map(String) : [];
  const text = [...items, typeof includedMd === "string" ? includedMd : ""].join("\n");
  return TICKET_RE.test(text) && !/\bnot included\b|\bexcluded\b/i.test(text);
}

/**
 * Mirrors buildQuote for the From vehicle at the tour's own length:
 * fixed price → tour's included miles (plus measured route miles on automatic
 * prices), else the hour tier; extra hours at the class extra-hour rate.
 * Hourly fallback (no fixed price) → hour tier miles; extra hours at the hourly rate.
 */
export function tourPriceCovers(args: {
  row: any;
  fromClass: { hourly_rate: number | null; extra_hour_rate: number | null } | null;
  hasFixedPrice: boolean;
  tiers: Tier[];
}): TourPriceCovers {
  const { row, fromClass, hasFixedPrice, tiers } = args;
  const hours = pos(row?.default_duration_hours ?? row?.duration_hours);
  let includedMiles: number | null = null;
  let extraHour: number | null = null;
  if (fromClass && hours != null) {
    if (hasFixedPrice) {
      const tpl = pos(row?.included_miles);
      const auto = row?.price_mode === "auto" ? pos(row?.auto_price_route_miles) : null;
      includedMiles = tpl != null || auto != null ? Math.max(tpl ?? 0, auto ?? 0) : tierMiles(hours, tiers);
      extraHour = pos(fromClass.extra_hour_rate ?? fromClass.hourly_rate);
    } else {
      includedMiles = tierMiles(hours, tiers);
      extraHour = pos(fromClass.hourly_rate);
    }
  }
  return {
    hours,
    includedMiles: includedMiles != null ? Math.round(includedMiles) : null,
    extraHourPence: extraHour != null ? Math.round(extraHour * 100) : null,
    ticketsIncluded: tourIncludesTickets(row?.included, row?.included_md),
  };
}

const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? "hour" : "hours"}`;
const fmtPounds = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`;

/** Full list for the tour page. */
export function priceCoverLines(c: TourPriceCovers): string[] {
  const lines: string[] = [];
  if (c.hours != null) lines.push(`${fmtHours(c.hours)} with your driver`);
  if (c.includedMiles != null) lines.push(`Up to ${c.includedMiles} miles included`);
  lines.push("Price per vehicle, not per person");
  lines.push(c.ticketsIncluded ? "Entry tickets included" : "Entry tickets not included");
  if (c.extraHourPence != null) lines.push(`Extra hours ${fmtPounds(c.extraHourPence)} per hour`);
  return lines;
}

/** One short line for tour cards. */
export function priceCoverSummary(c: TourPriceCovers): string {
  const parts: string[] = [];
  if (c.hours != null) parts.push(`${Number.isInteger(c.hours) ? c.hours : c.hours.toFixed(1)} hrs`);
  if (c.includedMiles != null) parts.push(`${c.includedMiles} miles`);
  parts.push("per vehicle");
  return parts.join(" · ");
}
