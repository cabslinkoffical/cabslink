import { describe, it, expect } from "vitest";
import { splitGroup, suggestGroups, groupLabel, vehiclesForClass, MAX_GROUP_VEHICLES } from "@/lib/tour-group";

// Capacities as in the live fleet (passengers / large cases).
const van = { id: "van", name: "Eight-Seater Van", max_passengers: 8, max_luggage: 8, hourly_rate: 85 };
const mini = { id: "mini", name: "Executive Minibus", max_passengers: 16, max_luggage: 16, hourly_rate: 0 };
const saloon = { id: "saloon", name: "Saloon", max_passengers: 4, max_luggage: 2, hourly_rate: 50 };
const mpv = { id: "mpv", name: "Standard MPV", max_passengers: 4, max_luggage: 4, hourly_rate: 55 };
const classes = [van, mini, saloon, mpv];

describe("automatic quantities for every vehicle class", () => {
  it("keeps smaller options selectable with two vehicles", () => {
    expect(vehiclesForClass(saloon, 5, 0)).toEqual(["saloon", "saloon"]);
    expect(vehiclesForClass(van, 5, 0)).toEqual(["van"]);
  });
  it("selects three vehicles for nine passengers in four-seat cars", () => {
    expect(vehiclesForClass(saloon, 9, 0)).toEqual(Array(3).fill("saloon"));
  });
  it("selects four vehicles for thirteen passengers in four-seat cars", () => {
    expect(vehiclesForClass(saloon, 13, 0)).toEqual(Array(4).fill("saloon"));
  });
  it("uses luggage capacity too without increasing the vehicle limits", () => {
    expect(vehiclesForClass(saloon, 4, 7)).toEqual(Array(4).fill("saloon"));
    expect(saloon.max_luggage).toBe(2);
  });
  it("rejects quantities outside existing booking limits", () => {
    expect(vehiclesForClass(saloon, 25, 0)).toBeNull();
    expect(vehiclesForClass(saloon, 1, 3)).toBeNull();
  });
});

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
  it("adds a second vehicle when luggage exceeds one vehicle's limit", () => {
    expect(suggestGroups([van], 2, 9)[0]).toEqual(["van", "van"]);
    expect(splitGroup(["van", "van"], [van], 2, 9).ok).toBe(true);
    expect(van.max_luggage).toBe(8);
  });
  it("adds a third vehicle when passengers exceed two vehicles' limits", () => {
    expect(suggestGroups([van], 17, 0)[0]).toEqual(["van", "van", "van"]);
    expect(splitGroup(["van", "van", "van"], [van], 17, 0).ok).toBe(true);
    expect(van.max_passengers).toBe(8);
  });
  it("adds a third vehicle when luggage exceeds two vehicles' limits", () => {
    expect(suggestGroups([van], 3, 17)[0]).toEqual(["van", "van", "van"]);
  });
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
