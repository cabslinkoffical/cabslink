import { describe, expect, it } from "vitest";
import { childSeatChoices, childSeatsLabel, parseChildSeats } from "@/lib/child-seats";

const catalogue = [
  { key: "child_seat", name: "Infant / Baby Seat", category: "child_seat", active: true, max_quantity: 6 },
  { key: "toddler_seat", name: "Toddler Child Seat", category: "child_seat", active: true, max_quantity: 6 },
  { key: "booster_seat", name: "High-Back Booster", category: "child_seat", active: true, max_quantity: 2 },
  { key: "waiting_time", name: "Waiting Time", category: "waiting", active: true, max_quantity: 8 },
];

describe("child seat types", () => {
  it("keeps each seat type with its own count", () => {
    const out = childSeatChoices([{ key: "toddler_seat", quantity: 2 }, { key: "booster_seat", quantity: 1 }], catalogue);
    expect(out).toEqual([
      { key: "toddler_seat", name: "Toddler Child Seat", quantity: 2 },
      { key: "booster_seat", name: "High-Back Booster", quantity: 1 },
    ]);
  });
  it("ignores extras that are not child seats", () => {
    expect(childSeatChoices([{ key: "waiting_time", quantity: 30 }], catalogue)).toEqual([]);
  });
  it("caps a seat type at its admin limit", () => {
    expect(childSeatChoices([{ key: "booster_seat", quantity: 5 }], catalogue)[0].quantity).toBe(2);
  });
  it("labels the seats for the booking page and emails", () => {
    expect(childSeatsLabel([{ key: "toddler_seat", name: "Toddler Child Seat", quantity: 2 }, { key: "child_seat", name: "Infant / Baby Seat", quantity: 1 }], 3))
      .toBe("2 × Toddler Child Seat, 1 × Infant / Baby Seat");
  });
  it("falls back to the seat total for older bookings without types", () => {
    expect(childSeatsLabel(parseChildSeats(null), 2)).toBe("2 child seats");
    expect(childSeatsLabel([], 0)).toBeNull();
  });
});
