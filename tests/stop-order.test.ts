import { describe, it, expect } from "vitest";
import { applySegmentOrders, moveStop, orderSegments, segmentsToOptimise } from "@/lib/stop-order";

const s = (id: string, locked = false) => ({ placeId: id, locked });

describe("tour best-order planning", () => {
  it("splits free stops into stretches around locked stops", () => {
    const stops = [s("a"), s("b"), s("L", true), s("c"), s("d"), s("e")];
    expect(orderSegments(stops)).toEqual([
      { from: -1, to: 2, free: [0, 1] },
      { from: 2, to: 6, free: [3, 4, 5] },
    ]);
  });

  it("keeps locked stops in place when the best order is applied", () => {
    const stops = [s("a"), s("b"), s("L", true), s("c"), s("d"), s("e")];
    const segs = segmentsToOptimise(stops);
    const next = applySegmentOrders(stops, segs, [[1, 0], [2, 0, 1]]);
    expect(next.map((x) => x.placeId)).toEqual(["b", "a", "L", "e", "c", "d"]);
    expect(next[2]!.placeId).toBe("L");
  });

  it("ignores an order that is not a full permutation", () => {
    const stops = [s("a"), s("b"), s("c")];
    const segs = segmentsToOptimise(stops);
    expect(applySegmentOrders(stops, segs, [[0, 0, 1]]).map((x) => x.placeId)).toEqual(["a", "b", "c"]);
  });

  it("never drags a locked stop or drops onto one", () => {
    const stops = [s("a"), s("L", true), s("b")];
    expect(moveStop(stops, 1, 0)).toBe(stops);
    expect(moveStop(stops, 0, 1)).toBe(stops);
    expect(moveStop([s("a"), s("b"), s("c")], 0, 2).map((x) => x.placeId)).toEqual(["b", "c", "a"]);
  });
});
