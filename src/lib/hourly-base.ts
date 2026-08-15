/**
 * Hourly / day-hire base price (pure, shared by server engine and tests).
 *
 * Hourly hire is priced per charged hour. When a class also has a day rate
 * configured (`dailyPrice` + `includedHoursPerDay`), full days are billed at
 * the day rate and any remaining hours at the per-hour rate. The customer is
 * always charged the cheaper of the two so a day rate can never be more
 * expensive than the hours it replaces.
 */

export type HourlyBaseInput = {
  perHour: number;
  chargedHours: number;
  dailyPrice?: number | null;
  includedHoursPerDay?: number | null;
};

export type HourlyBaseResult = {
  /** Total for a single vehicle, before rules / extras / tax. */
  total: number;
  /** Whole days billed at the day rate (0 when day pricing does not apply). */
  days: number;
  /** Hours billed at the per-hour rate. */
  hours: number;
  basis: "hourly" | "daily";
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeHourlyBase(input: HourlyBaseInput): HourlyBaseResult {
  const perHour = Math.max(0, Number(input.perHour) || 0);
  const chargedHours = Math.max(0, Number(input.chargedHours) || 0);
  const hourlyTotal = r2(perHour * chargedHours);

  const daily = Math.max(0, Number(input.dailyPrice) || 0);
  const includedHours = Math.max(0, Number(input.includedHoursPerDay) || 0);
  if (daily <= 0 || includedHours <= 0 || chargedHours < includedHours) {
    return { total: hourlyTotal, days: 0, hours: chargedHours, basis: "hourly" };
  }

  const days = Math.floor(chargedHours / includedHours);
  const remainderHours = r2(chargedHours - days * includedHours);
  const dailyTotal = r2(days * daily + remainderHours * perHour);

  if (dailyTotal < hourlyTotal) {
    return { total: dailyTotal, days, hours: remainderHours, basis: "daily" };
  }
  return { total: hourlyTotal, days: 0, hours: chargedHours, basis: "hourly" };
}
