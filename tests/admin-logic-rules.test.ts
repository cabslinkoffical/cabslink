import { describe, it, expect } from "vitest";
import { ukDate, ukDayStart, ukRange, ukMonthStart, ukBucket } from "@/lib/uk-time";
import { bookingInTab, todayIso } from "@/lib/admin-bookings";
import { isTourTransitionAllowed } from "@/lib/tour-enquiries";
import { aggregateCustomers } from "@/lib/admin-lists.functions";
import { csvCell } from "@/lib/booking-export";

describe("UK business dates", () => {
  it("uses the UK date just after midnight in summer time, not UTC", () => {
    // 00:30 BST on 15 July = 23:30 UTC on 14 July
    expect(ukDate(new Date("2026-07-14T23:30:00Z"))).toBe("2026-07-15");
    expect(todayIso(new Date("2026-07-14T23:30:00Z"))).toBe("2026-07-15");
  });
  it("starts a summer UK day at 23:00 UTC the evening before", () => {
    expect(ukDayStart("2026-07-15").toISOString()).toBe("2026-07-14T23:00:00.000Z");
  });
  it("starts a winter UK day at midnight UTC", () => {
    expect(ukDayStart("2026-01-15").toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
  it("covers the whole last day of a report range", () => {
    expect(ukRange("2026-07-01", "2026-07-31")).toEqual({
      startIso: "2026-06-30T23:00:00.000Z",
      endIso: "2026-07-31T23:00:00.000Z",
    });
  });
  it("never repeats or skips a month when today is the 31st", () => {
    const now = new Date("2026-03-31T12:00:00Z");
    const months = [5, 4, 3, 2, 1, 0].map((i) => ukMonthStart(i, now));
    expect(months).toEqual(["2025-10-01", "2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01"]);
  });
  it("buckets weeks from Monday", () => {
    expect(ukBucket("2026-11-04T10:00:00Z", "week")).toBe("2026-11-02");
  });
});

describe("dashboard counts follow the booking tabs", () => {
  const today = "2026-11-02";
  it("counts an awaiting-payment future booking as upcoming", () => {
    expect(bookingInTab({ status: "awaiting_payment", pickup_date: "2026-11-05" }, "upcoming", today)).toBe(true);
  });
  it("counts bidding bookings under 'need a driver' (New tab)", () => {
    expect(bookingInTab({ status: "bidding" }, "new", today)).toBe(true);
  });
  it("counts driver-en-route and passenger-on-board as on the road", () => {
    expect(bookingInTab({ status: "driver_en_route" }, "on_road", today)).toBe(true);
    expect(bookingInTab({ status: "passenger_on_board" }, "on_road", today)).toBe(true);
  });
  it("counts rejected bookings as cancelled", () => {
    expect(bookingInTab({ status: "rejected" }, "cancelled", today)).toBe(true);
  });
  it("leaves tours out of transfer counts", () => {
    expect(bookingInTab({ status: "new", service_type: "private_tour" }, "all", today)).toBe(false);
  });
});

describe("tour status moves", () => {
  it("allows a paid tour to be completed", () => {
    expect(isTourTransitionAllowed("confirmed", "completed")).toBe(true);
  });
  it("never reopens a completed or cancelled tour", () => {
    expect(isTourTransitionAllowed("completed", "confirmed")).toBe(false);
    expect(isTourTransitionAllowed("cancelled", "new")).toBe(false);
  });
});

describe("customer total paid", () => {
  it("counts only money collected, net of refunds", () => {
    const rows = [
      { id: "b1", email: "a@x.com", customer_name: "A", price: 100, pickup_date: "2026-01-01", created_at: "2026-01-01" },
      { id: "b2", email: "a@x.com", customer_name: "A", price: 80, pickup_date: "2026-02-01", created_at: "2026-02-01" },
    ];
    const payments = [
      { booking_id: "b1", amount: 100, refunded_amount: 30, status: "paid" },
      { booking_id: "b2", amount: 80, refunded_amount: 0, status: "unpaid" },
    ];
    const [c] = aggregateCustomers(rows, payments);
    expect(c.bookings).toBe(2);
    expect(c.spend).toBe(70);
  });
});

describe("spreadsheet export safety", () => {
  it("opens formula-looking text as plain text", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
  it("leaves UK phone numbers unchanged", () => {
    expect(csvCell("+44 333 888 2991")).toBe("+44 333 888 2991");
  });
  it("quotes values containing a carriage return", () => {
    expect(csvCell("a\rb")).toBe("\"a\rb\"");
  });
});
