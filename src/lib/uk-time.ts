/**
 * UK business calendar helpers. Cabslink operates in Europe/London, so
 * "today", day boundaries and month buckets in the staff console use UK
 * local dates (GMT/BST) rather than UTC or the server's timezone.
 * Browser- and server-safe (Intl only).
 */
export const UK_TZ = "Europe/London";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: UK_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** UK calendar date (YYYY-MM-DD) of an instant. */
export function ukDate(at: Date | string | number = new Date()): string {
  return dateFmt.format(new Date(at));
}

/** Minutes the UK is ahead of UTC at a given instant (0 in GMT, 60 in BST). */
function ukOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The UTC instant at which a UK calendar date (YYYY-MM-DD) begins. */
export function ukDayStart(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  // Midnight UK = midnight UTC minus the offset in force at that moment.
  const first = new Date(guess.getTime() - ukOffsetMinutes(guess) * 60000);
  return new Date(guess.getTime() - ukOffsetMinutes(first) * 60000);
}

/** Add whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Inclusive UK-day range as [startIso, endExclusiveIso). */
export function ukRange(from: string, to: string): { startIso: string; endIso: string } {
  return { startIso: ukDayStart(from).toISOString(), endIso: ukDayStart(addDays(to, 1)).toISOString() };
}

/** First day (YYYY-MM-DD) of the UK month `back` months before the current one. */
export function ukMonthStart(back = 0, now: Date = new Date()): string {
  const [y, m] = ukDate(now).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 - back, 1));
  return t.toISOString().slice(0, 10);
}

/** YYYY-MM bucket key of an instant in UK time. */
export function ukMonthKey(at: Date | string): string {
  return ukDate(at).slice(0, 7);
}
