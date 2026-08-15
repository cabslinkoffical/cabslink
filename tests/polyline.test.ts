import { describe, it, expect } from "vitest";
import { decodePolyline, milesToMetres, milesToKm } from "@/lib/polyline";

describe("decodePolyline", () => {
  it("decodes the reference Google example", () => {
    const pts = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(pts).toHaveLength(3);
    expect(pts[0].lat).toBeCloseTo(38.5, 5);
    expect(pts[0].lng).toBeCloseTo(-120.2, 5);
    expect(pts[1].lat).toBeCloseTo(40.7, 5);
    expect(pts[1].lng).toBeCloseTo(-120.95, 5);
    expect(pts[2].lat).toBeCloseTo(43.252, 5);
    expect(pts[2].lng).toBeCloseTo(-126.453, 5);
  });

  it("returns an empty path for empty input", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("unit conversion (internal unit = statute miles)", () => {
  it("converts miles to metres for map circles", () => {
    expect(milesToMetres(1)).toBeCloseTo(1609.344, 3);
    expect(milesToMetres(5)).toBeCloseTo(8046.72, 2);
  });

  it("converts miles to km for display", () => {
    expect(milesToKm(10)).toBe(16.09);
  });
});
