import { describe, expect, it } from "vitest";
import { previewVehicleOptions } from "@/lib/preview-vehicles";

const vehicles = [
  { id: "coach", name: "Coach Bus (55-seater)", active: true },
  { id: "old-saloon", name: "Saloon", active: true },
  { id: "saloon", name: "Saloon", active: true },
  { id: "minibus", name: "Executive Minibus", active: true },
  { id: "qa", name: "QA TEST Vehicle Class", active: false },
];
const classes = [
  { name: "Saloon", pricing_vehicle_id: "saloon", active: true, display_order: 1 },
  { name: "Executive Minibus", pricing_vehicle_id: "minibus", active: true, display_order: 9 },
];
const profiles = ["coach", "old-saloon", "saloon", "minibus"].map((vehicle_id) => ({ vehicle_id, status: true }));

describe("admin test-quote vehicle list", () => {
  it("shows only vehicles linked to an active vehicle class", () => {
    expect(previewVehicleOptions(vehicles, classes, profiles)).toEqual([
      { id: "saloon", name: "Saloon" },
      { id: "minibus", name: "Executive Minibus" },
    ]);
  });
  it("hides the unlinked Coach Bus and duplicate Saloon rows", () => {
    const ids = previewVehicleOptions(vehicles, classes, profiles).map((v) => v.id);
    expect(ids).not.toContain("coach");
    expect(ids).not.toContain("old-saloon");
  });
  it("drops a class that is switched off", () => {
    const off = classes.map((c) => (c.pricing_vehicle_id === "minibus" ? { ...c, active: false } : c));
    expect(previewVehicleOptions(vehicles, off, profiles).map((v) => v.id)).toEqual(["saloon"]);
  });
});
