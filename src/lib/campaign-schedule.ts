/**
 * When an offer-email campaign should next go out. Times are UK wall-clock
 * (send hour on a UK calendar day), so a 10:00 campaign stays at 10:00 in
 * both GMT and BST. Browser-safe: no server imports.
 */
import { addDays, ukDate, ukLocalToMs } from "@/lib/uk-time";

export const CAMPAIGN_FREQUENCIES = ["once", "daily", "weekly", "fortnightly", "monthly"] as const;
export type CampaignFrequency = (typeof CAMPAIGN_FREQUENCIES)[number];

export type CampaignSchedule = {
  frequency: CampaignFrequency;
  sendHour: number;
  /** 0 = Sunday … 6 = Saturday (weekly / fortnightly). */
  weekday?: number | null;
  /** 1–28 (monthly). */
  monthDay?: number | null;
  /** First UK date the campaign may send (YYYY-MM-DD). */
  startsOn?: string | null;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * The next send instant strictly after `after`, or null when nothing fits.
 * `lastRunAt` keeps fortnightly campaigns 14 days apart.
 */
export function nextRunAt(s: CampaignSchedule, after: Date = new Date(), lastRunAt?: Date | string | null): Date | null {
  const hour = Math.min(23, Math.max(0, Math.trunc(s.sendHour)));
  let day = ukDate(after);
  if (s.startsOn && /^\d{4}-\d{2}-\d{2}$/.test(s.startsOn) && s.startsOn > day) day = s.startsOn;
  let earliestDay = day;
  if (s.frequency === "fortnightly" && lastRunAt) {
    const gap = addDays(ukDate(lastRunAt), 14);
    if (gap > earliestDay) earliestDay = gap;
  }
  for (let i = 0; i < 70; i++) {
    const d = addDays(earliestDay, i);
    const fits =
      s.frequency === "once" || s.frequency === "daily" ? true
        : s.frequency === "weekly" || s.frequency === "fortnightly" ? dayOfWeek(d) === (s.weekday ?? 1)
          : s.frequency === "monthly" ? Number(d.slice(8, 10)) === (s.monthDay ?? 1)
            : false;
    if (!fits) continue;
    const ms = ukLocalToMs(d, `${String(hour).padStart(2, "0")}:00`);
    if (ms != null && ms > after.getTime()) return new Date(ms);
  }
  return null;
}

/** Plain-English summary, e.g. "Every Monday at 10:00". */
export function describeSchedule(s: CampaignSchedule): string {
  const at = `${String(s.sendHour).padStart(2, "0")}:00`;
  switch (s.frequency) {
    case "once": return `Once${s.startsOn ? ` on ${s.startsOn}` : ""} at ${at}`;
    case "daily": return `Every day at ${at}`;
    case "weekly": return `Every ${WEEKDAYS[s.weekday ?? 1]} at ${at}`;
    case "fortnightly": return `Every other ${WEEKDAYS[s.weekday ?? 1]} at ${at}`;
    case "monthly": return `Monthly on day ${s.monthDay ?? 1} at ${at}`;
  }
}
