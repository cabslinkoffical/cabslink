import { describe, expect, it } from "vitest";
import { classCapacity, vehicleFits } from "@/lib/vehicle-capacity";

// Passengers / large bags / cabin bags exactly as the fleet page lists them
// (live vehicle classes, 3 Nov 2026).
const FLEET: Array<[string, number, number, number]> = [
  ["Saloon", 4, 2, 2],
  ["Executive Saloon", 4, 2, 2],
  ["Luxury Saloon", 3, 2, 2],
  ["Electric Saloon", 3, 2, 2],
  ["Estate Car", 4, 3, 3],
  ["Standard MPV", 4, 4, 3],
  ["Wheelchair Accessible Vehicle", 4, 2, 2],
  ["Seven-Seater MPV", 6, 3, 6],
  ["Electric MPV", 7, 5, 3],
  ["Premium MPV", 7, 7, 4],
  ["Eight-Seater Van", 8, 8, 4],
  ["Executive Minibus", 16, 16, 8],
];

describe.each(FLEET)("%s booking limits match the fleet page", (_name, pax, large, cabin) => {
  const cap = classCapacity({ passengers: pax, large_luggage: large, cabin_bags: cabin, hand_luggage: 0 });
  const full = { passengers: pax, luggage: large, handLuggage: cabin };

  it("accepts the advertised maximum", () => {
    expect(vehicleFits(cap, 1, full)).toBe(true);
  });
  it("rejects one passenger over", () => {
    expect(vehicleFits(cap, 1, { ...full, passengers: pax + 1 })).toBe(false);
  });
  it("rejects one large bag over", () => {
    expect(vehicleFits(cap, 1, { ...full, luggage: large + 1 })).toBe(false);
  });
  it("rejects one cabin bag over", () => {
    expect(vehicleFits(cap, 1, { ...full, handLuggage: cabin + 1 })).toBe(false);
  });
  it("two vehicles carry double", () => {
    expect(vehicleFits(cap, 2, { passengers: pax * 2, luggage: large * 2, handLuggage: cabin * 2 })).toBe(true);
    expect(vehicleFits(cap, 2, { passengers: pax * 2 + 1, luggage: 0, handLuggage: 0 })).toBe(false);
  });
});

describe("cabin bags", () => {
  it("cabin bags are the limit even when the old hand-luggage column differs", () => {
    expect(classCapacity({ passengers: 6, large_luggage: 3, cabin_bags: 6, hand_luggage: 3 }).hand_luggage).toBe(6);
  });
});
