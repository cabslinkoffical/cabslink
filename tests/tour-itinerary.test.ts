import { describe, expect, it } from "vitest";
import { fitsParty, templateStopsInOrder, tourHourChoices, wizardSteps, addHoursToTime } from "@/lib/tour-itinerary";

const stop = (poi: string, order: number, mandatory = false) => ({
  poi_id: poi, place_id: `p-${poi}`, name: poi, stop_order: order,
  recommended_visit_minutes: 60, mandatory, default_selected: true,
});

describe("tour booking form rules", () => {
  it("ready-made tours skip the stops step; custom tours and hourly hire keep it", () => {
    expect(wizardSteps("tour", "premade")).toEqual(["tour", "when", "vehicle", "details"]);
    expect(wizardSteps("tour", "custom")).toEqual(["tour", "when", "stops", "vehicle", "details"]);
    expect(wizardSteps("hourly", "custom")).toEqual(["when", "stops", "vehicle", "details"]);
  });

  it("a vehicle fits only with enough seats and suitcase space", () => {
    const saloon = { id: "s", max_passengers: 3, max_luggage: 2 };
    expect(fitsParty(saloon, 3, 2)).toBe(true);
    expect(fitsParty(saloon, 3, 3)).toBe(false);
    expect(fitsParty(saloon, 4, 0)).toBe(false);
  });

  it("an optional stop put back returns to its place in the tour, not the end", () => {
    const stops = [stop("Culross", 2), stop("Linlithgow", 1, true), stop("Falkland", 3)];
    const order = templateStopsInOrder(stops, new Set(["Culross", "Falkland"]), 10).map((s) => s.name);
    expect(order).toEqual(["Linlithgow", "Culross", "Falkland"]);
    const without = templateStopsInOrder(stops, new Set(["Falkland"]), 10).map((s) => s.name);
    expect(without).toEqual(["Linlithgow", "Falkland"]);
  });

  it("a ready-made tour offers only lengths inside its own range", () => {
    expect(tourHourChoices({ default_duration_hours: 8, min_duration_hours: null, max_duration_hours: null }, [4, 6, 8, 10])).toEqual([8]);
    expect(tourHourChoices({ default_duration_hours: 8, min_duration_hours: 8, max_duration_hours: 10 }, [4, 6, 8, 10, 12])).toEqual([8, 10]);
  });

  it("finish time adds the hours to the start", () => {
    expect(addHoursToTime("09:00", 8)).toBe("17:00");
  });
});
