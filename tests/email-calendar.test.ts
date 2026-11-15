import { describe, it, expect } from "vitest";
import { campaignSendDays, afterTripDay, monthGrid } from "@/lib/email-calendar";

const base = { id: "c", name: "x", sendHour: 10, status: "active" } as const;
const now = new Date("2026-11-01T00:00:00Z");

describe("email calendar", () => {
  it("weekly campaign sends every Monday of the month", () => {
    expect(campaignSendDays({ ...base, frequency: "weekly", weekday: 1 }, "2026-11-01", "2026-11-30", now)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });
  it("paused campaigns do not appear", () => {
    expect(campaignSendDays({ ...base, status: "paused", frequency: "daily" }, "2026-11-01", "2026-11-30", now)).toEqual([]);
  });
  it("once campaign appears on its start day only", () => {
    expect(campaignSendDays({ ...base, frequency: "once", startsOn: "2026-11-20" }, "2026-11-01", "2026-11-30", now)).toEqual(["2026-11-20"]);
  });
  it("after-trip email lands delay days after the trip, not for cancelled trips", () => {
    const rule = { id: "r", name: "t", trigger_type: "after_trip", delay_days: 3, active: true };
    const trip = { id: "b", ref: "R", date: "2026-11-28", time: null, name: "A", kind: "transfer", status: "confirmed" };
    expect(afterTripDay(trip, rule)).toBe("2026-12-01");
    expect(afterTripDay({ ...trip, status: "cancelled" }, rule)).toBeNull();
    expect(afterTripDay(trip, { ...rule, active: false })).toBeNull();
  });
  it("November 2026 grid starts on Sunday column", () => {
    expect(monthGrid("2026-11")[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
  });
});
