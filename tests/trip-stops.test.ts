import { describe, expect, it } from "vitest";
import { mergeTripStops } from "@/lib/trip-stops";

const castle = { place_id: "poi-castle", label: "Doune Castle", minutes: 60, category: "castle" };

describe("typed stops kept with sightseeing stops", () => {
  it("keeps a typed stop when a sightseeing stop is chosen", () => {
    const out = mergeTripStops([{ placeId: "typed-hotel", label: "Balmoral Hotel" }], [castle]);
    expect(out.map((s) => s.place_id)).toEqual(["typed-hotel", "poi-castle"]);
    expect(out[0].minutes).toBe(0);
  });
  it("does not add a typed stop twice when it is also a chosen sightseeing stop", () => {
    const out = mergeTripStops([{ placeId: "poi-castle", label: "Doune Castle" }], [castle]);
    expect(out).toHaveLength(1);
  });
  it("does not bring back a seeded tour stop the customer unticked", () => {
    const out = mergeTripStops([{ placeId: "poi-loch", label: "Loch Lomond", minutes: 45 }], [castle]);
    expect(out.map((s) => s.place_id)).toEqual(["poi-castle"]);
  });
  it("returns nothing when no sightseeing stops are chosen (plain stop path used)", () => {
    expect(mergeTripStops([{ placeId: "typed-hotel", label: "Hotel" }], [])).toEqual([]);
  });
});
