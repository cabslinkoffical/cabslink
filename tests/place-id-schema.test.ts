import { describe, it, expect } from "vitest";
import { placeIdSchema, selectedPlaceSchema } from "@/lib/place-id";

describe("placeIdSchema — accepts realistic Google Place IDs", () => {
  // Real-world Place ID formats observed from the Places API.
  const realistic = [
    "ChIJdd4hrwug2EcRmSrV3Vo6llI",              // classic ChIJ
    "EiwxMjMgQmFrZXIgU3QsIExvbmRvbg",           // base64-ish, Ei prefix
    "GhIJQWDl0CIeQUARxks3icF8U8A",              // Gh prefix
    "EicxNDkgSGlnaCBTdCwgTG9uZG9uIFcxLCBVSw",   // long base64-ish, no punctuation
    "ChIJN1t_tDeuEmsRUsoyG83frY4",              // underscore
    "ChIJa-b_C.d=E@F:G-H_i",                   // synthetic legal chars
  ];
  for (const id of realistic) {
    it(`accepts ${id.slice(0, 12)}…`, () => {
      expect(() => placeIdSchema.parse(id)).not.toThrow();
    });
  }
  it("trims surrounding whitespace", () => {
    expect(placeIdSchema.parse("  ChIJabc  ")).toBe("ChIJabc");
  });
});

describe("placeIdSchema — rejects unsafe input", () => {
  it("rejects empty / whitespace only / embedded whitespace", () => {
    expect(() => placeIdSchema.parse("")).toThrow();
    expect(() => placeIdSchema.parse("   ")).toThrow();
    expect(() => placeIdSchema.parse("abc def")).toThrow();
    expect(() => placeIdSchema.parse("abc\ndef")).toThrow();
    expect(() => placeIdSchema.parse("abc\tdef")).toThrow();
  });
  it("rejects control characters", () => {
    expect(() => placeIdSchema.parse("abc\x00def")).toThrow();
    expect(() => placeIdSchema.parse("abc\x7fdef")).toThrow();
  });
  it("rejects punctuation used in injection attacks", () => {
    expect(() => placeIdSchema.parse("abc; DROP TABLE bookings")).toThrow();
    expect(() => placeIdSchema.parse("'; --")).toThrow();
    expect(() => placeIdSchema.parse("<script>")).toThrow();
    expect(() => placeIdSchema.parse("../../etc/passwd")).toThrow();
  });
  it("enforces a sensible maximum length", () => {
    expect(() => placeIdSchema.parse("A".repeat(301))).toThrow();
  });
  it("selectedPlaceSchema requires both placeId and label", () => {
    expect(() => selectedPlaceSchema.parse({ placeId: "ChIJ_ok", label: "Somewhere" })).not.toThrow();
    expect(() => selectedPlaceSchema.parse({ placeId: "", label: "x" })).toThrow();
    expect(() => selectedPlaceSchema.parse({ placeId: "ChIJ_ok", label: "" })).toThrow();
  });
});
