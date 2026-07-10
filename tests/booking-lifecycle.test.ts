import { describe, it, expect } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  BOOKING_STATUSES,
  STATUS_META,
  isValidTransition,
  paymentNextStepMessage,
  statusLabel,
} from "@/lib/booking-lifecycle";

describe("booking lifecycle metadata", () => {
  it("declares every known status", () => {
    expect(BOOKING_STATUSES.length).toBeGreaterThanOrEqual(10);
    for (const s of BOOKING_STATUSES) expect(STATUS_META[s]).toBeDefined();
  });

  it("cancel and reject require a reason", () => {
    expect(STATUS_META.cancelled.requiresReason).toBe(true);
    expect(STATUS_META.rejected.requiresReason).toBe(true);
    expect(STATUS_META.confirmed.requiresReason).toBe(false);
  });

  it("terminal statuses have no outbound transitions", () => {
    expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
    expect(ALLOWED_TRANSITIONS.rejected).toEqual([]);
  });

  it("rejects invalid transitions explicitly listed in the spec", () => {
    expect(isValidTransition("completed", "new")).toBe(false);
    expect(isValidTransition("cancelled", "passenger_on_board")).toBe(false);
    expect(isValidTransition("rejected", "driver_en_route")).toBe(false);
  });

  it("accepts the normal happy-path transitions", () => {
    expect(isValidTransition("new", "confirmed")).toBe(true);
    expect(isValidTransition("confirmed", "assigned")).toBe(true);
    expect(isValidTransition("assigned", "driver_en_route")).toBe(true);
    expect(isValidTransition("driver_en_route", "passenger_on_board")).toBe(true);
    expect(isValidTransition("passenger_on_board", "completed")).toBe(true);
  });

  it("same-status is trivially valid (no-op)", () => {
    expect(isValidTransition("assigned", "assigned")).toBe(true);
  });

  it("provides a customer-safe next-step message and never claims card payment", () => {
    const msg = paymentNextStepMessage("manual", "new");
    expect(msg).toMatch(/received/i);
    expect(msg.toLowerCase()).not.toContain("card charged");
    expect(msg.toLowerCase()).not.toContain("payment successful");
  });

  it("labels statuses without exposing enum values", () => {
    expect(statusLabel("passenger_on_board")).not.toContain("_");
    expect(statusLabel(null)).toBe("—");
  });
});
