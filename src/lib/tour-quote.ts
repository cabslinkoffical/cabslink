/**
 * The hourly tour model, as pure maths. Used by the server to produce the
 * authoritative quote and by the booking wizard to render it.
 *
 * Two limits govern a tour day and they behave differently:
 *   Miles are money  — over the allowance is charged per mile, under changes nothing.
 *   Hours are a wall — a day that cannot physically be driven cannot be booked.
 */

export type HourTier = { hours: number; included_miles: number; is_bookable: boolean };

export type TourRules = {
  earliest_start_time: string;
  latest_finish_time: string;
  max_bookable_hours: number;
  minimum_stop_minutes: number;
  pickup_buffer_minutes: number;
  mileage_tolerance_miles: number;
  minimum_notice_hours: number;
  checkout_hold_minutes: number;
};

export type ClassRates = {
  id: string;
  name: string;
  hourly_rate: number | null;
  extra_hour_rate: number | null;
  extra_mile_rate: number | null;
  min_hours: number | null;
  max_hours: number | null;
  max_passengers: number | null;
  max_luggage: number | null;
};

export type QuoteLine = { label: string; detail?: string; amount: number };

export type TimeState = "comfortable" | "tight" | "wont_fit";

export type TourQuote = {
  mode: "premade" | "custom";
  hours: number;
  includedMiles: number;
  routeMiles: number;
  driveMinutes: number;
  extraMiles: number;
  extraMileRate: number;
  exploreMinutes: number;
  perStopMinutes: number;
  stopCount: number;
  state: TimeState;
  lines: QuoteLine[];
  total: number;
  /** Set when the day cannot be booked, in the customer's words. */
  blockedReason: string | null;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** The tier for a duration, or the largest tier at or below it. */
export function tierFor(hours: number, tiers: HourTier[]): HourTier | null {
  const sorted = [...tiers].sort((a, b) => a.hours - b.hours);
  const exact = sorted.find((t) => t.hours === hours);
  if (exact) return exact;
  let best: HourTier | null = null;
  for (const t of sorted) if (t.hours <= hours) best = t;
  return best;
}

export function includedMilesFor(hours: number, tiers: HourTier[]): number {
  return tierFor(hours, tiers)?.included_miles ?? 0;
}

export function bookableTiers(tiers: HourTier[], rules: TourRules): HourTier[] {
  return tiers
    .filter((t) => t.is_bookable && t.hours <= rules.max_bookable_hours)
    .sort((a, b) => a.hours - b.hours);
}

export type TimeCheck = {
  exploreMinutes: number;
  perStopMinutes: number;
  state: TimeState;
};

/**
 * explore = (hours x 60) - pickup buffer - driving minutes
 * per stop = explore / stops
 * Comfortable when every stop gets its recommended dwell, tight down to the
 * minimum, and impossible below it.
 */
export function checkTime(args: {
  hours: number;
  driveMinutes: number;
  stopCount: number;
  dwellMinutes: number[];
  rules: TourRules;
}): TimeCheck {
  const { hours, driveMinutes, stopCount, dwellMinutes, rules } = args;
  const explore = hours * 60 - rules.pickup_buffer_minutes - driveMinutes;
  const perStop = stopCount > 0 ? explore / stopCount : explore;

  if (explore <= 0) return { exploreMinutes: explore, perStopMinutes: perStop, state: "wont_fit" };
  if (stopCount === 0) return { exploreMinutes: explore, perStopMinutes: perStop, state: "comfortable" };

  const wanted = dwellMinutes.length ? Math.max(...dwellMinutes) : rules.minimum_stop_minutes;
  if (perStop < rules.minimum_stop_minutes) {
    return { exploreMinutes: explore, perStopMinutes: perStop, state: "wont_fit" };
  }
  if (perStop < wanted) return { exploreMinutes: explore, perStopMinutes: perStop, state: "tight" };
  return { exploreMinutes: explore, perStopMinutes: perStop, state: "comfortable" };
}

export function minutesLabel(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} minutes`;
  if (r === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h} hour${h === 1 ? "" : "s"} ${r} minutes`;
}

export function blockedMessage(q: {
  routeMiles: number;
  driveMinutes: number;
  hours: number;
  perStopMinutes: number;
  stopCount: number;
}): string {
  return (
    `This route needs more time. Your stops come to ${Math.round(q.routeMiles)} miles and about ` +
    `${minutesLabel(q.driveMinutes)} of driving. In a ${q.hours}-hour day that leaves roughly ` +
    `${Math.max(0, Math.round(q.perStopMinutes))} minutes at each stop, which is a photograph and back in the car. ` +
    `Add hours, or take a stop off.`
  );
}

/** Build the itemised quote. The server is the only place this decides money. */
export function buildQuote(args: {
  mode: "premade" | "custom";
  hours: number;
  /** Hours the fixed price covers (premade only). */
  baseHours?: number;
  fixedPrice?: number | null;
  rates: ClassRates;
  tiers: HourTier[];
  rules: TourRules;
  /** Miles included by the premade tour, overriding the tier allowance. */
  templateIncludedMiles?: number | null;
  routeMiles: number;
  driveMinutes: number;
  dwellMinutes: number[];
  extras?: QuoteLine[];
  vehicleLabel?: string;
}): TourQuote {
  const {
    mode, hours, rates, tiers, rules, routeMiles, driveMinutes, dwellMinutes,
    extras = [], fixedPrice = null, baseHours = hours, templateIncludedMiles = null,
  } = args;

  const extraMileRate = Number(rates.extra_mile_rate ?? 0);
  const hourlyRate = Number(rates.hourly_rate ?? 0);
  const extraHourRate = Number(rates.extra_hour_rate ?? hourlyRate);

  const lines: QuoteLine[] = [];
  const label = args.vehicleLabel ?? rates.name;

  let includedMiles: number;
  if (mode === "premade" && fixedPrice != null) {
    lines.push({ label: `${label}, ${baseHours} hours`, detail: "Fixed tour price", amount: round2(fixedPrice) });
    const extraHours = Math.max(0, hours - baseHours);
    if (extraHours > 0) {
      lines.push({
        label: `Extra hours, ${extraHours} at £${extraHourRate.toFixed(2)}`,
        amount: round2(extraHours * extraHourRate),
      });
    }
    const tierAllowance = includedMilesFor(hours, tiers);
    const baseAllowance = templateIncludedMiles ?? includedMilesFor(baseHours, tiers);
    includedMiles = extraHours > 0
      ? baseAllowance + Math.max(0, tierAllowance - includedMilesFor(baseHours, tiers))
      : baseAllowance;
  } else {
    lines.push({ label: `${label}, ${hours} hours`, amount: round2(hours * hourlyRate) });
    includedMiles = includedMilesFor(hours, tiers);
  }

  const extraMiles = Math.max(0, round2(routeMiles - includedMiles));
  if (extraMiles > 0 && extraMileRate > 0) {
    lines.push({
      label: `Extra mileage, ${Math.round(extraMiles)} mi at £${extraMileRate.toFixed(2)}`,
      amount: round2(extraMiles * extraMileRate),
    });
  }
  for (const e of extras) lines.push(e);

  const time = checkTime({ hours, driveMinutes, stopCount: dwellMinutes.length, dwellMinutes, rules });
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));

  return {
    mode,
    hours,
    includedMiles,
    routeMiles: round2(routeMiles),
    driveMinutes: Math.round(driveMinutes),
    extraMiles,
    extraMileRate,
    exploreMinutes: Math.round(time.exploreMinutes),
    perStopMinutes: Math.round(time.perStopMinutes),
    stopCount: dwellMinutes.length,
    state: time.state,
    lines,
    total,
    blockedReason:
      time.state === "wont_fit"
        ? blockedMessage({
            routeMiles,
            driveMinutes,
            hours,
            perStopMinutes: time.perStopMinutes,
            stopCount: dwellMinutes.length,
          })
        : null,
  };
}

export type AddHoursOption = {
  hours: number;
  addedHours: number;
  perStopMinutesNow: number;
  perStopMinutesAfter: number;
  grossCost: number;
  extraAllowanceMiles: number;
  mileageSaving: number;
  netCost: number;
  fixesIt: boolean;
};

/**
 * The add-hours hook. Offers the smallest increment that solves the problem
 * plus one larger option, always netting off the mileage the extra hours bring.
 */
export function addHoursOptions(args: {
  current: TourQuote;
  tiers: HourTier[];
  rules: TourRules;
  rates: ClassRates;
  mode: "premade" | "custom";
  dwellMinutes: number[];
}): AddHoursOption[] {
  const { current, tiers, rules, rates, mode, dwellMinutes } = args;
  if (current.state === "comfortable") return [];

  const hourlyRate = Number(rates.hourly_rate ?? 0);
  const extraHourRate = Number(rates.extra_hour_rate ?? hourlyRate);
  const extraMileRate = Number(rates.extra_mile_rate ?? 0);
  const perHour = mode === "premade" ? extraHourRate : hourlyRate;

  const longer = bookableTiers(tiers, rules).filter((t) => t.hours > current.hours);
  const evaluated: AddHoursOption[] = longer.map((t) => {
    const time = checkTime({
      hours: t.hours,
      driveMinutes: current.driveMinutes,
      stopCount: dwellMinutes.length,
      dwellMinutes,
      rules,
    });
    const newExtraMiles = Math.max(0, current.routeMiles - t.included_miles);
    const mileageSaving = round2((current.extraMiles - newExtraMiles) * extraMileRate);
    const addedHours = round2(t.hours - current.hours);
    const grossCost = round2(addedHours * perHour);
    return {
      hours: t.hours,
      addedHours,
      perStopMinutesNow: current.perStopMinutes,
      perStopMinutesAfter: Math.round(time.perStopMinutes),
      grossCost,
      extraAllowanceMiles: round2(Math.max(0, t.included_miles - current.includedMiles)),
      mileageSaving,
      netCost: round2(grossCost - mileageSaving),
      fixesIt: time.state === "comfortable",
    };
  });

  const smallestFix = evaluated.find((o) => o.fixesIt) ?? evaluated[0];
  if (!smallestFix) return [];
  const larger = evaluated.find((o) => o.hours > smallestFix.hours);
  return larger ? [smallestFix, larger] : [smallestFix];
}
