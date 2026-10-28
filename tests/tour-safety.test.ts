import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({ errorTable: "", count: 0, missingCoord: "", routingFails: false,
  template: { active: true, published: true, is_bookable: true } as any }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: (table: string) => {
    const values: Record<string, any> = {
      tour_hour_tiers: [{ hours: 4, included_miles: 100, is_bookable: true }],
      tour_rules: null,
      vehicle_classes: [{ id: "class", name: "Test", active: true, hourly_rate: 50, max_passengers: 4, max_luggage: 3, min_hours: 3, max_hours: 8 }],
      vehicle_class_daily_capacity: { max_tours_per_day: 1 }, scenic_route_templates: state.template,
    };
    const result = () => ({ data: values[table] ?? [], count: state.count, error: state.errorTable === table ? { message: "failed" } : null });
    const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => result(), then: (resolve: any) => Promise.resolve(result()).then(resolve) };
    return q;
  },
} }));
vi.mock("@/lib/place-coords.server", () => ({ resolveCoords: async (_db: unknown, ids: string[]) =>
  new Map(ids.filter((id) => id !== state.missingCoord).map((id) => [id, { lat: 55.9, lng: -3.2 }])) }));
vi.mock("@/lib/route-distance.server", () => ({ computeRoute: async () => {
  if (state.routingFails) throw new Error("no route");
  return { distanceMiles: 20, durationSeconds: 1800 };
} }));
import { capacityLeft, quoteTourImpl } from "@/lib/tour-quote.server";
const input = { mode: "custom" as const, startPlaceId: "start", startLabel: "Start", hours: 4,
  vehicleClassId: "class", passengers: 2, luggage: 1, stops: [{ placeId: "stop", name: "Stop" }] };
beforeEach(() => { state.errorTable = ""; state.count = 0; state.missingCoord = ""; state.routingFails = false;
  state.template = { active: true, published: true, is_bookable: true }; });
describe("tour quote and capacity fail closed", () => {
  it.each(["vehicle_class_daily_capacity", "bookings"])("blocks on failed %s query", async (table) => {
    state.errorTable = table;
    await expect(capacityLeft("class", "2026-12-01")).rejects.toThrow(/availability right now/);
  });
  it("reports no remaining slots at capacity", async () => { state.count = 1; expect(await capacityLeft("class", "2026-12-01")).toBe(0); });
  it.each([
    [{ passengers: 5 }, /passengers/], [{ luggage: 4 }, /luggage/],
    [{ hours: 2 }, /at least 3 hours/], [{ hours: 9 }, /up to 8 hours/],
  ])("rejects requests outside class limits: %j", async (overrides, message) => {
    await expect(quoteTourImpl({ ...input, ...overrides })).rejects.toThrow(message);
  });
  it.each(["active", "published", "is_bookable"])("rejects templates with %s false", async (flag) => {
    state.template[flag] = false;
    await expect(quoteTourImpl({ ...input, mode: "premade", templateId: "template" })).rejects.toThrow(/not available/);
  });
  it("rejects an unroutable stop rather than using estimated zero miles", async () => {
    state.routingFails = true;
    await expect(quoteTourImpl(input)).rejects.toThrow(/route every stop/);
  });
  it("rejects a stop without coordinates", async () => {
    state.missingCoord = "stop";
    await expect(quoteTourImpl(input)).rejects.toThrow(/route every stop/);
  });
  it("produces a real route quote for a valid request", async () => {
    const result = await quoteTourImpl(input);
    expect(result.quote.routeMiles).toBe(20);
    expect(result.quote.total).toBe(200);
  });
});