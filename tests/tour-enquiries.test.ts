import { describe, it, expect } from "vitest";
import {
  TOUR_SERVICE_TYPE,
  TOUR_STATUSES,
  TOUR_QUOTED_STATUS,
  isTourEnquiry,
  isTourBookingStatus,
  tourNameFrom,
  tourStatusLabel,
} from "@/lib/tour-enquiries";
import { BOOKING_STATUSES } from "@/lib/booking-lifecycle";

describe("tour enquiry lifecycle", () => {
  it("uses a service type the bookings table accepts", () => {
    expect(TOUR_SERVICE_TYPE).toBe("private_tour");
  });

  it("only uses statuses that exist in the booking lifecycle", () => {
    for (const s of TOUR_STATUSES) expect(BOOKING_STATUSES).toContain(s);
    expect(BOOKING_STATUSES).toContain(TOUR_QUOTED_STATUS);
  });

  it("moves to awaiting payment once a price is quoted", () => {
    expect(TOUR_QUOTED_STATUS).toBe("awaiting_payment");
    expect(tourStatusLabel("awaiting_payment")).toMatch(/awaiting payment/i);
    expect(tourStatusLabel("new")).toBe("Enquiry received");
  });

  it("recognises tour bookings by service type only", () => {
    expect(isTourEnquiry({ service_type: "private_tour" })).toBe(true);
    expect(isTourEnquiry({ service_type: "direct_transfer" })).toBe(false);
    expect(isTourEnquiry({})).toBe(false);
  });

  it("labels statuses without exposing enum values", () => {
    for (const s of TOUR_STATUSES) expect(tourStatusLabel(s)).not.toContain("_");
    expect(tourStatusLabel(null)).toBe("—");
    expect(isTourBookingStatus("confirmed")).toBe(true);
    expect(isTourBookingStatus("bidding")).toBe(false);
  });

  it("shows the tour name, falling back to the enquiry notes", () => {
    expect(tourNameFrom({ tour_name: "Loch Ness Day Tour" })).toBe("Loch Ness Day Tour");
    expect(tourNameFrom({ notes: "TOUR ENQUIRY — Isle of Skye (isle-of-skye)\nRoute: A → B" })).toBe(
      "Isle of Skye",
    );
    expect(tourNameFrom({})).toBe("Tour enquiry");
  });
});
