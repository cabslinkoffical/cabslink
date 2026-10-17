import { describe, it, expect } from "vitest";
import {
  areaPrefill,
  destinationPrefill,
  journeyPrefill,
  localMapMode,
  serviceLocationPrefill,
} from "@/lib/local-page";

/**
 * The one local-page pattern fills the booking form from each page's own
 * data: a page with both ends fills both; a page with one end fills that
 * end and leaves the other for the visitor. Nothing is invented.
 */
describe("local page prefill rules", () => {
  it("shows the airport and surrounding area before address resolution or when lookup fails", () => {
    expect(localMapMode(undefined, undefined, { lat: 57.2, lng: -2.2 })).toBe("location");
  });

  it("switches to a journey map when both different endpoints are selected", () => {
    expect(localMapMode("AIRPORT", "DESTINATION", { lat: 57.2, lng: -2.2 })).toBe("route");
  });

  it("does not invent a location when page coordinates are unavailable", () => {
    expect(localMapMode("AIRPORT", undefined, null)).toBeNull();
    expect(localMapMode(undefined, undefined, { lat: NaN, lng: -2.2 })).toBeNull();
  });

  it("fills the pickup for transport hubs (airport, station) — arrivals need collecting", () => {
    expect(destinationPrefill("airport", "Edinburgh Airport")).toEqual({ pickup: "Edinburgh Airport" });
    expect(destinationPrefill("station", "Haymarket")).toEqual({ pickup: "Haymarket" });
  });

  it("fills the drop-off for everywhere else the visitor travels to", () => {
    for (const type of [
      "town",
      "city",
      "distillery",
      "attraction",
      "cruise-port",
      "hospital",
      "university",
      "hotel",
    ]) {
      expect(destinationPrefill(type, "Somewhere")).toEqual({ dropoff: "Somewhere" });
    }
  });

  it("fills both ends for journey pages, which know the whole route", () => {
    expect(journeyPrefill("Edinburgh Airport", "St Andrews")).toEqual({
      pickup: "Edinburgh Airport",
      dropoff: "St Andrews",
    });
  });

  it("fills the pickup for service+location pages (service runs from the location)", () => {
    expect(serviceLocationPrefill("Edinburgh")).toEqual({ pickup: "Edinburgh" });
  });

  it("fills the drop-off for area pages (travelling to the area)", () => {
    expect(areaPrefill("St Andrews")).toEqual({ dropoff: "St Andrews" });
  });

  it("leaves the other field empty so the visitor completes it", () => {
    const p = destinationPrefill("town", "Cupar");
    expect(p.pickup).toBeUndefined();
    expect(p.dropoff).toBe("Cupar");
  });
});
