import { describe, it, expect } from "vitest";
import { canonicalStopsPayload, stopsFingerprint } from "@/lib/stops-fingerprint";

const base = {
  pickupPlaceId: "p1",
  destinationPlaceId: "d1",
  routeMode: "scenic" as const,
  stops: [
    { place_id: "s1", minutes: 30 },
    { place_id: "s2", minutes: 45 },
  ],
};

describe("stopsFingerprint", () => {
  it("is stable for identical inputs", async () => {
    const a = await stopsFingerprint(base);
    const b = await stopsFingerprint({ ...base, stops: [...base.stops] });
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // SHA-256 hex
  });

  it("changes when a stop is added", async () => {
    const a = await stopsFingerprint(base);
    const b = await stopsFingerprint({
      ...base,
      stops: [...base.stops, { place_id: "s3", minutes: 15 }],
    });
    expect(a).not.toBe(b);
  });

  it("changes when a stop duration changes", async () => {
    const a = await stopsFingerprint(base);
    const b = await stopsFingerprint({
      ...base,
      stops: [{ place_id: "s1", minutes: 60 }, { place_id: "s2", minutes: 45 }],
    });
    expect(a).not.toBe(b);
  });

  it("changes when stop order changes", async () => {
    const a = await stopsFingerprint(base);
    const b = await stopsFingerprint({
      ...base,
      stops: [{ place_id: "s2", minutes: 45 }, { place_id: "s1", minutes: 30 }],
    });
    expect(a).not.toBe(b);
  });

  it("changes when route mode changes", async () => {
    const a = await stopsFingerprint(base);
    const b = await stopsFingerprint({ ...base, routeMode: "optimised" });
    expect(a).not.toBe(b);
  });

  it("changes when pickup or destination changes", async () => {
    const a = await stopsFingerprint(base);
    const b = await stopsFingerprint({ ...base, pickupPlaceId: "p2" });
    const c = await stopsFingerprint({ ...base, destinationPlaceId: "d2" });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  it("canonical payload is deterministic", () => {
    expect(canonicalStopsPayload(base)).toBe(canonicalStopsPayload({ ...base }));
  });
});
