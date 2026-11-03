import { describe, expect, it, vi } from "vitest";

const computeRoute = vi.fn(async (input: any) => {
  if (!input.allowLoop && input.originPlaceId === input.destinationPlaceId) throw new Error("same place");
  return { distanceMiles: 110, durationSeconds: 3 * 3600 };
});
vi.mock("@/lib/route-distance.server", () => ({ computeRoute }));

const { realDistanceMiles } = await import("@/lib/pricing-helpers.server");

describe("tours that start and finish at the same place", () => {
  it("are measured as a loop through their stops", async () => {
    const r = await realDistanceMiles("edinburgh", "edinburgh", ["culross", "falkland"]);
    expect(r.miles).toBe(110);
    expect(computeRoute).toHaveBeenLastCalledWith(expect.objectContaining({ allowLoop: true }));
  });
  it("are still refused when there are no stops", async () => {
    await expect(realDistanceMiles("edinburgh", "edinburgh", [])).rejects.toThrow();
  });
  it("normal trips are not treated as loops", async () => {
    await realDistanceMiles("edinburgh", "glasgow", ["stirling"]);
    expect(computeRoute).toHaveBeenLastCalledWith(expect.objectContaining({ allowLoop: false }));
  });
});
