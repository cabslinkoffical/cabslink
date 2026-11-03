import type { TourRules } from "@/lib/tour-quote";
import { ukClock, ukDate, ukLocalToMs } from "@/lib/uk-time";

/**
 * Notice-period and same-day checks for a tour start. Tour dates and times
 * are UK local time (GMT in winter, BST in summer) whatever the server clock,
 * so "today", "now" and the start instant are all read in Europe/London.
 * Returns the customer-facing problem, or null when the start is allowed.
 */
export function tourStartProblem(
  date: string,
  time: string,
  rules: Pick<TourRules, "minimum_notice_hours" | "allow_same_day" | "same_day_cutoff_time">,
  now: Date = new Date(),
): string | null {
  const startMs = ukLocalToMs(date, time);
  if (startMs != null && startMs - now.getTime() < rules.minimum_notice_hours * 3_600_000) {
    return `Tours need at least ${rules.minimum_notice_hours} hours' notice. Please call us for anything sooner.`;
  }
  if (date === ukDate(now)) {
    if (!rules.allow_same_day) {
      return "Same-day tours can't be booked online. Please call us and we'll do our best to help.";
    }
    if (ukClock(now) > rules.same_day_cutoff_time) {
      return `Same-day tours can only be booked until ${rules.same_day_cutoff_time}. Please choose another date or call us.`;
    }
  }
  return null;
}
