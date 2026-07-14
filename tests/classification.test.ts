import { describe, it, expect } from "vitest";
import { classifyService } from "@/lib/classification";

const T = { sightseeingThresholdMinutes: 30, tourThresholdMinutes: 120, tourThresholdStops: 3 };

describe("classifyService", () => {
  it("no stops → direct_transfer", () => {
    const r = classifyService([], T);
    expect(r.service_type).toBe("direct_transfer");
    expect(r.attraction_stops).toBe(0);
  });

  it("one short attraction stop below sightseeing threshold → transfer_with_stop", () => {
    const r = classifyService([{ place_id: "a", minutes: 15, category: "castle" }], T);
    expect(r.service_type).toBe("transfer_with_stop");
  });

  it("attraction minutes ≥ sightseeing threshold → sightseeing_transfer", () => {
    const r = classifyService([{ place_id: "a", minutes: 30, category: "castle" }], T);
    expect(r.service_type).toBe("sightseeing_transfer");
    expect(r.planned_attraction_minutes).toBe(30);
  });

  it("attraction minutes ≥ tour minutes threshold → private_tour", () => {
    const r = classifyService(
      [
        { place_id: "a", minutes: 60, category: "castle" },
        { place_id: "b", minutes: 60, category: "viewpoint" },
      ],
      T,
    );
    expect(r.service_type).toBe("private_tour");
  });

  it("attraction stops ≥ tour stop threshold → private_tour", () => {
    const r = classifyService(
      [
        { place_id: "a", minutes: 15, category: "castle" },
        { place_id: "b", minutes: 15, category: "viewpoint" },
        { place_id: "c", minutes: 15, category: "landmark" },
      ],
      T,
    );
    expect(r.service_type).toBe("private_tour");
  });

  it("comfort stops do not count toward sightseeing/tour thresholds", () => {
    const r = classifyService(
      [
        { place_id: "a", minutes: 90, category: "comfort_stop" },
        { place_id: "b", minutes: 90, category: "fuel_stop" },
        { place_id: "c", minutes: 90, category: "toilet_stop" },
      ],
      T,
    );
    expect(r.service_type).toBe("transfer_with_stop");
    expect(r.planned_attraction_minutes).toBe(0);
    expect(r.attraction_stops).toBe(0);
  });

  it("mix of attraction + comfort stops counts only attraction time", () => {
    const r = classifyService(
      [
        { place_id: "a", minutes: 20, category: "castle" },
        { place_id: "b", minutes: 200, category: "comfort_stop" },
      ],
      T,
    );
    // 20 min attraction is below 30 → transfer_with_stop, not tour.
    expect(r.service_type).toBe("transfer_with_stop");
  });
});
