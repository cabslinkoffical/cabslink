import { describe, it, expect } from "vitest";
import { nextStatusOptions, isStatusLocked, listLabelFor } from "@/lib/booking-lifecycle";

const today = "2026-11-21";
describe("booking status rules", () => {
  it("a paid confirmed booking can still get a driver", () => {
    expect(nextStatusOptions({ status: "confirmed", payment_status: "paid", pickup_date: today }, today)).toEqual(["assigned"]);
    expect(isStatusLocked("confirmed", "paid")).toBe(false);
  });
  it("paid bookings never go back to unpaid states, rejected, or cancel outside refunds", () => {
    const opts = nextStatusOptions({ status: "new", payment_status: "paid" }, today);
    expect(opts).not.toContain("awaiting_payment");
    expect(opts).not.toContain("rejected");
    expect(opts).not.toContain("cancelled");
  });
  it("on-the-day steps wait for the pickup day", () => {
    expect(nextStatusOptions({ status: "assigned", payment_status: "unpaid", pickup_date: "2026-11-22" }, today)).toEqual(["confirmed", "cancelled"]);
    expect(nextStatusOptions({ status: "assigned", payment_status: "paid", pickup_date: today }, today)).toEqual(["confirmed", "driver_en_route", "passenger_on_board", "completed"]);
  });
  it("passenger on board can only complete; final statuses offer nothing", () => {
    expect(nextStatusOptions({ status: "passenger_on_board", pickup_date: today }, today)).toEqual(["completed"]);
    expect(nextStatusOptions({ status: "completed" }, today)).toEqual([]);
  });
  it("names the list a booking moves to", () => {
    expect(listLabelFor("cancelled", "refunded")).toBe("Refunds");
    expect(listLabelFor("assigned")).toBe("Driver assigned");
  });
});
