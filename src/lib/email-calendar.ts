/**
 * Browser-safe rules for the Email automation calendar: which UK days a
 * scheduled campaign will send on, and when an "after a trip" automatic
 * email is expected for each trip. Uses the same nextRunAt the sender uses,
 * so the calendar never disagrees with what actually goes out.
 */
import { nextRunAt, type CampaignSchedule } from "@/lib/campaign-schedule";
import { addDays, ukDate, ukLocalToMs } from "@/lib/uk-time";

export type CalendarCampaign = CampaignSchedule & { id: string; name: string; status: string; lastRunAt?: string | null };
export type CalendarRule = { id: string; name: string; trigger_type: string; delay_days: number; active: boolean };
export type CalendarTrip = { id: string; ref: string; date: string; time: string | null; name: string; kind: string; status: string };

/** First and last UK date of a YYYY-MM month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** Weeks (Mon–Sun) covering the month; days outside it are null. */
export function monthGrid(month: string): (string | null)[][] {
  const { from, to } = monthRange(month);
  const lead = (new Date(`${from}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = from; d <= to; d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * UK dates in [from, to] on which an active campaign will send. Paused,
 * draft and completed campaigns never appear; past runs are not invented.
 */
export function campaignSendDays(c: CalendarCampaign, from: string, to: string, now: Date = new Date()): string[] {
  if (c.status !== "active") return [];
  const out: string[] = [];
  const startMs = Math.max(now.getTime(), (ukLocalToMs(from, "00:00") ?? 0) - 1);
  let after = new Date(startMs);
  let last: Date | string | null | undefined = c.lastRunAt;
  for (let i = 0; i < 62; i++) {
    const next = nextRunAt(c, after, last);
    if (!next) break;
    const day = ukDate(next);
    if (day > to) break;
    if (day >= from) out.push(day);
    if (c.frequency === "once") break;
    last = next;
    after = next;
  }
  return out;
}

/** Day the "after a trip" email is expected for a trip, or null when the trip will not trigger one. */
export function afterTripDay(trip: CalendarTrip, rule: CalendarRule): string | null {
  if (!rule.active || rule.trigger_type !== "after_trip") return null;
  if (trip.status === "cancelled") return null;
  return addDays(trip.date, rule.delay_days);
}
