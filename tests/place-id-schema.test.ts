import { describe, it, expect } from "vitest";
import { placeIdSchema, selectedPlaceSchema } from "@/lib/place-id";

describe("placeIdSchema", () => {
  it("accepts sane Google Place IDs", () => {
    expect(() => placeIdSchema.parse("ChIJdd4hrwug2EcRmSrV3Vo6llI")).not.toThrow();
    expect(() => placeIdSchema.parse("EiwxMjMgQmFrZXIgU3QsIExvbmRvbg")).not.toThrow();
  });
  it("rejects empty / whitespace / control chars", () => {
    expect(() => placeIdSchema.parse("")).toThrow();
    expect(() => placeIdSchema.parse("   ")).toThrow();
    expect(() => placeIdSchema.parse("abc\ndef")).toThrow();
    expect(() => placeIdSchema.parse("abc\x00def")).toThrow();
  });
  it("rejects arbitrary punctuation used by attackers", () => {
    expect(() => placeIdSchema.parse("abc; DROP TABLE bookings")).toThrow();
    expect(() => placeIdSchema.parse("'; --")).toThrow();
    expect(() => placeIdSchema.parse("<script>")).toThrow();
  });
  it("selectedPlaceSchema requires both placeId and label", () => {
    expect(() => selectedPlaceSchema.parse({ placeId: "ChIJ_ok", label: "Somewhere" })).not.toThrow();
    expect(() => selectedPlaceSchema.parse({ placeId: "", label: "x" })).toThrow();
    expect(() => selectedPlaceSchema.parse({ placeId: "ChIJ_ok", label: "" })).toThrow();
  });
});
