import { describe, expect, it } from "vitest";
import { cancellationCoverOffered, ukClock, ukDate, ukLocalToMs } from "@/lib/uk-time";
import { matchSurcharges, type JourneyContext, type SurchargeRule } from "@/lib/pricing-rules";
import { tourStartProblem } from "@/lib/tour-timing";
import { pickupTimestamp } from "@/lib/manage-booking.functions";

// Pickups are UK wall-clock times: GMT in January (UTC+0), BST in July (UTC+1).
const cases = [
  { label: "January 23:30", date: "2027-01-15", time: "23:30", utc: "2027-01-15T23:30:00.000Z" },
  { label: "January 00:30", date: "2027-01-16", time: "00:30", utc: "2027-01-16T00:30:00.000Z" },
  { label: "July 23:30", date: "2027-07-15", time: "23:30", utc: "2027-07-15T22:30:00.000Z" },
  { label: "July 00:30", date: "2027-07-16", time: "00:30", utc: "2027-07-15T23:30:00.000Z" },
];

describe("UK pickup time → instant", () => {
  for (const c of cases) {
    it(`${c.label} is read as UK time`, () => {
      expect(new Date(ukLocalToMs(c.date, c.time)!).toISOString()).toBe(c.utc);
      expect(ukDate(c.utc)).toBe(c.date);
      expect(ukClock(c.utc)).toBe(c.time);
    });
  }
});

describe("Manage Booking change/cancel cut-off uses UK time", () => {
  for (const c of cases) {
    it(`${c.label}`, () => {
      expect(new Date(pickupTimestamp(c.date, c.time)!).toISOString()).toBe(c.utc);
    });
  }
  it("a July 00:30 pickup is 24h away at 23:30 UTC the day before last, not an hour later", () => {
    const pickup = pickupTimestamp("2027-07-16", "00:30")!;
    const now = Date.parse("2027-07-14T23:30:00Z");
    expect((pickup - now) / 3_600_000).toBe(24);
  });
});

describe("timed surcharges use UK time", () => {
  const ctx = (date: string, time: string): JourneyContext => ({
    pickupPlaceId: "a", destinationPlaceId: "b", distanceMiles: 10, date, time,
  });
  const rule = (starts: string, ends: string): SurchargeRule => ({
    id: "r", name: "Event", charge_type: "fixed", amount: 10, applies_to: null,
    vehicle_id: null, vehicle_class_id: null, starts_at: starts, ends_at: ends,
    days_of_week: null, time_from: null, time_to: null, priority: 0, active: true,
  });

  it("July 23:30 UK falls inside a 22:00–23:00 UTC event window", () => {
    const r = rule("2027-07-15T22:00:00Z", "2027-07-15T23:00:00Z");
    expect(matchSurcharges([r], ctx("2027-07-15", "23:30"))).toHaveLength(1);
  });
  it("July 00:30 UK belongs to the previous UTC evening", () => {
    const r = rule("2027-07-15T23:00:00Z", "2027-07-16T00:00:00Z");
    expect(matchSurcharges([r], ctx("2027-07-16", "00:30"))).toHaveLength(1);
  });
  it("January 23:30 UK is outside a window that ended at 23:00 UTC", () => {
    const r = rule("2027-01-15T22:00:00Z", "2027-01-15T23:00:00Z");
    expect(matchSurcharges([r], ctx("2027-01-15", "23:30"))).toHaveLength(0);
  });
  it("January 00:30 UK is inside a window starting at 00:00 UTC", () => {
    const r = rule("2027-01-16T00:00:00Z", "2027-01-16T01:00:00Z");
    expect(matchSurcharges([r], ctx("2027-01-16", "00:30"))).toHaveLength(1);
  });
});

describe("tour same-day and notice checks use UK time", () => {
  const rules = { minimum_notice_hours: 0, allow_same_day: true, same_day_cutoff_time: "23:00" };

  it("July 23:30 UK (22:30 UTC) is past a 23:00 same-day cut-off", () => {
    const now = new Date("2027-07-15T22:30:00Z");
    expect(tourStartProblem("2027-07-15", "23:45", rules, now)).toMatch(/only be booked until 23:00/);
  });
  it("July 00:30 UK (23:30 UTC the day before) counts as the new UK day", () => {
    const now = new Date("2027-07-15T23:30:00Z");
    // 16 July is "today" in the UK; 00:30 is before the 23:00 cut-off.
    expect(tourStartProblem("2027-07-16", "09:00", rules, now)).toBeNull();
    // 15 July is already yesterday in the UK.
    expect(tourStartProblem("2027-07-15", "23:45", rules, now)).toMatch(/notice/);
  });
  it("January 23:30 UK is past the cut-off, January 00:30 is a new day", () => {
    expect(tourStartProblem("2027-01-15", "23:45", rules, new Date("2027-01-15T23:30:00Z"))).toMatch(/until 23:00/);
    expect(tourStartProblem("2027-01-16", "09:00", rules, new Date("2027-01-16T00:30:00Z"))).toBeNull();
  });
  it("12-hour notice is measured from UK pickup time in July", () => {
    const strict = { ...rules, minimum_notice_hours: 12 };
    // Pickup 16 July 00:30 BST = 15 July 23:30 UTC; 12h earlier is 11:30 UTC.
    expect(tourStartProblem("2027-07-16", "00:30", strict, new Date("2027-07-15T11:31:00Z"))).toMatch(/12 hours' notice/);
    expect(tourStartProblem("2027-07-16", "00:30", strict, new Date("2027-07-15T11:29:00Z"))).toBeNull();
  });
});

describe("cancellationCoverOffered", () => {
  it("is offered only when the tour is more than two days after the booking date", () => {
    // Booked 14 Nov: 16 Nov is exactly two days away, so no cover choice.
    expect(cancellationCoverOffered("2026-11-16", "2026-11-14")).toBe(false);
    expect(cancellationCoverOffered("2026-11-15", "2026-11-14")).toBe(false);
    expect(cancellationCoverOffered("2026-11-14", "2026-11-14")).toBe(false);
    // 17 Nov is the first date a cover choice is offered.
    expect(cancellationCoverOffered("2026-11-17", "2026-11-14")).toBe(true);
    expect(cancellationCoverOffered("2027-01-10", "2026-11-14")).toBe(true);
  });
  it("rejects missing or unreadable dates", () => {
    expect(cancellationCoverOffered("", "2026-11-14")).toBe(false);
    expect(cancellationCoverOffered(null, "2026-11-14")).toBe(false);
    expect(cancellationCoverOffered("14/11/2026", "2026-11-14")).toBe(false);
  });
});
