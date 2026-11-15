import { describe, expect, it } from "vitest";
import { nextRunAt } from "@/lib/campaign-schedule";

describe("campaign schedule (UK time)", () => {
  it("daily at 10:00 in summer is 09:00 UTC", () => {
    const r = nextRunAt({ frequency: "daily", sendHour: 10 }, new Date("2026-07-01T12:00:00Z"));
    expect(r?.toISOString()).toBe("2026-07-02T09:00:00.000Z");
  });
  it("daily at 10:00 in winter is 10:00 UTC, same day when still ahead", () => {
    const r = nextRunAt({ frequency: "daily", sendHour: 10 }, new Date("2026-12-01T08:00:00Z"));
    expect(r?.toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });
  it("weekly lands on the chosen weekday (Monday)", () => {
    const r = nextRunAt({ frequency: "weekly", sendHour: 9, weekday: 1 }, new Date("2026-11-15T12:00:00Z"));
    expect(r?.toISOString()).toBe("2026-11-16T09:00:00.000Z");
  });
  it("fortnightly waits 14 days after the last send", () => {
    const r = nextRunAt({ frequency: "fortnightly", sendHour: 9, weekday: 1 }, new Date("2026-11-16T09:05:00Z"), "2026-11-16T09:00:00Z");
    expect(r?.toISOString()).toBe("2026-11-30T09:00:00.000Z");
  });
  it("monthly uses the chosen day of the month", () => {
    const r = nextRunAt({ frequency: "monthly", sendHour: 10, monthDay: 1 }, new Date("2026-11-15T12:00:00Z"));
    expect(r?.toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });
  it("never sends before the start date", () => {
    const r = nextRunAt({ frequency: "once", sendHour: 10, startsOn: "2026-12-24" }, new Date("2026-11-15T12:00:00Z"));
    expect(r?.toISOString()).toBe("2026-12-24T10:00:00.000Z");
  });
});
