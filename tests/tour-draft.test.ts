import { describe, it, expect } from "vitest";
import { publishChecklist, readyToPublish, slugify, tourDraftSchema } from "@/lib/tour-draft";

const ready = {
  name: "Loch Lomond Day", slug: "loch-lomond-day", origin_place_id: "ChIJstart0000", destination_place_id: "ChIJstart0000",
  default_duration_hours: 8, stops: [{ active: true, hasPlace: true }], pricedVehicles: 0, hasImage: false,
};

describe("publish checklist", () => {
  it("allows publishing without a photo or tour price (hourly rates apply)", () => {
    expect(readyToPublish(publishChecklist(ready))).toBe(true);
  });
  it("blocks publishing without a start point", () => {
    expect(readyToPublish(publishChecklist({ ...ready, origin_place_id: null }))).toBe(false);
  });
  it("blocks publishing without a finish point", () => {
    expect(readyToPublish(publishChecklist({ ...ready, destination_place_id: null }))).toBe(false);
  });
  it("blocks publishing with no stops", () => {
    expect(readyToPublish(publishChecklist({ ...ready, stops: [] }))).toBe(false);
  });
  it("blocks publishing when a stop is switched off or not on the map", () => {
    expect(readyToPublish(publishChecklist({ ...ready, stops: [{ active: true, hasPlace: true }, { active: false, hasPlace: true }] }))).toBe(false);
    expect(readyToPublish(publishChecklist({ ...ready, stops: [{ active: true, hasPlace: false }] }))).toBe(false);
  });
});

describe("tour draft save rules", () => {
  it("turns a name into a web address", () => {
    expect(slugify("Loch Lomond & the Trossachs!")).toBe("loch-lomond-the-trossachs");
  });
  it("needs a name and address for a new tour", () => {
    expect(tourDraftSchema.safeParse({ tour: { name: "New day" } }).success).toBe(false);
    expect(tourDraftSchema.safeParse({ tour: { name: "New day", slug: "new-day" } }).success).toBe(true);
  });
  it("rejects a usual length outside the shortest–longest range", () => {
    expect(tourDraftSchema.safeParse({ tour: { name: "New day", slug: "new-day", min_duration_hours: 6, max_duration_hours: 8, default_duration_hours: 10 } }).success).toBe(false);
  });
  it("can't be used to publish a tour", () => {
    expect(tourDraftSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", tour: { published: true } }).success).toBe(false);
  });
});
