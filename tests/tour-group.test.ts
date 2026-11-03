import { describe, it, expect } from "vitest";
import { splitGroup, suggestGroups, groupLabel, MAX_GROUP_VEHICLES } from "@/lib/tour-group";

// Capacities as in the live fleet (passengers / large cases).
const van = { id: "van", name: "Eight-Seater Van", max_passengers: 8, max_luggage: 8, hourly_rate: 85 };
const mini = { id: "mini", name: "Executive Minibus", max_passengers: 16, max_luggage: 16, hourly_rate: 0 };
const saloon = { id: "saloon", name: "Saloon", max_passengers: 4, max_luggage: 2, hourly_rate: 50 };
const mpv = { id: "mpv", name: "Standard MPV", max_passengers: 4, max_luggage: 4, hourly_rate: 55 };
const classes = [van, mini, saloon, mpv];

describe("splitting a group between vehicles", () => {
  it("fills vehicles in order and gives every vehicle a passenger", () => {
    const r = splitGroup(["van", "van"], classes, 12, 10);
    expect(r).toEqual({ ok: true, shares: [
      { vehicleClassId: "van", passengers: 8, luggage: 8 },
      { vehicleClassId: "van", passengers: 4, luggage: 2 },
    ] });
  });
  it("refuses when the vehicles don't seat everyone", () => {
    const r = splitGroup(["van", "saloon"], classes, 13, 0);
    expect(r.ok).toBe(false);
  });
  it("refuses when the vehicles can't take the luggage", () => {
    expect(splitGroup(["saloon", "saloon"], classes, 6, 5).ok).toBe(false);
  });
  it("refuses more vehicles than passengers", () => {
    expect(splitGroup(["van", "van", "van"], classes, 2, 0).ok).toBe(false);
  });
  it(`refuses more than ${MAX_GROUP_VEHICLES} vehicles`, () => {
    expect(splitGroup(Array(MAX_GROUP_VEHICLES + 1).fill("saloon"), classes, 20, 0).ok).toBe(false);
  });
});

describe("suggested combinations", () => {
  it("picks the fewest vehicles that carry everyone", () => {
    const s = suggestGroups([van, saloon, mpv], 12, 6);
    expect(s[0]).toEqual(["van", "saloon"]);
    expect(s.every((ids) => splitGroup(ids, classes, 12, 6).ok)).toBe(true);
  });
  it("suggests two vans for 16 passengers when the minibus has no online price", () => {
    expect(suggestGroups([van, saloon, mpv], 16, 10)[0]).toEqual(["van", "van"]);
  });
});

describe("vehicle label", () => {
  it("counts repeated vehicles", () => {
    expect(groupLabel(["van", "van", "saloon"], classes)).toBe("2 × Eight-Seater Van + Saloon");
  });
});
