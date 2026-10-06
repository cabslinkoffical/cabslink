import { describe, it, expect } from "vitest";
import { isStatusLocked, isValidTransition } from "@/lib/booking-lifecycle";

describe("booking status lock", () => {
  it("locks final statuses regardless of payment", () => {
    expect(isStatusLocked("completed", "unpaid")).toBe(true);
    expect(isStatusLocked("cancelled", "unpaid")).toBe(true);
    expect(isStatusLocked("rejected", "unpaid")).toBe(true);
  });

  it("locks paid and partially paid bookings", () => {
    expect(isStatusLocked("confirmed", "paid")).toBe(true);
    expect(isStatusLocked("new", "paid")).toBe(true);
    expect(isStatusLocked("assigned", "partial")).toBe(true);
  });

  it("leaves unpaid active bookings editable", () => {
    expect(isStatusLocked("new", "unpaid")).toBe(false);
    expect(isStatusLocked("confirmed", "unpaid")).toBe(false);
    expect(isStatusLocked("assigned", "failed")).toBe(false);
    expect(isStatusLocked("confirmed", "refunded")).toBe(false);
  });

  it("final statuses have no allowed transitions", () => {
    expect(isValidTransition("completed", "confirmed")).toBe(false);
    expect(isValidTransition("cancelled", "new")).toBe(false);
    expect(isValidTransition("rejected", "new")).toBe(false);
  });
});
