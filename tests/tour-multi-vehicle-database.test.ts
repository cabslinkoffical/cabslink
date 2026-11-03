import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// The two functions from the multi-vehicle migration, run against temporary tables.
const migration = readFileSync("drizzle/migrations/0020_tour_multi_vehicle.sql", "utf8");
const usedFn = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.tour_vehicles_used"), migration.indexOf("$$;") + 3);
const reserveFn = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.reserve_tour_booking"), migration.indexOf("$function$;") + 11);
const van = "11111111-1111-4111-8111-111111111111";
const saloon = "33333333-3333-4333-8333-333333333333";
const base = { vehicle_class_id: van, pickup_date: "2026-12-01", passengers: 12, luggage: 10, booked_hours: 4,
  service_type: "private_tour", status: "pending_payment", booking_ref: "GROUP", vehicle_count: 2,
  tour_vehicles: [
    { vehicle_class_id: van, passengers: 8, luggage: 8 },
    { vehicle_class_id: van, passengers: 4, luggage: 2 },
  ] };

function sql(query: string) {
  return execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
const toTemp = (f: string) => f.replaceAll("public.", "pg_temp.").replace("SET search_path = public", "SET search_path = pg_temp").replace("SET search_path TO 'public'", "SET search_path TO pg_temp");
function local(cap: number, query: string) {
  return sql(`BEGIN;
    CREATE TEMP TABLE vehicle_classes (id uuid PRIMARY KEY, active boolean, max_passengers integer, passengers integer,
      max_luggage integer, large_luggage integer, min_hours numeric, max_hours numeric);
    CREATE TEMP TABLE scenic_route_templates (id uuid PRIMARY KEY, active boolean, published boolean, is_bookable boolean);
    CREATE TEMP TABLE vehicle_class_daily_capacity (vehicle_class_id uuid PRIMARY KEY, max_tours_per_day integer);
    CREATE TEMP TABLE bookings (id uuid DEFAULT gen_random_uuid(), vehicle_class_id uuid, pickup_date date, passengers integer,
      luggage integer, booked_hours numeric, service_type text, status text, booking_ref text, scenic_template_id uuid,
      tour_vehicles jsonb, vehicle_count integer NOT NULL DEFAULT 1);
    INSERT INTO pg_temp.vehicle_classes VALUES ('${van}',true,8,8,8,8,3,8), ('${saloon}',true,4,4,2,2,3,8);
    INSERT INTO pg_temp.vehicle_class_daily_capacity VALUES ('${van}',${cap});
    ${toTemp(usedFn)}
    ${toTemp(reserveFn)}
    ${query}
    ROLLBACK;`);
}
const call = (changes: Record<string, unknown> = {}) =>
  `SELECT pg_temp.reserve_tour_booking('${JSON.stringify({ ...base, ...changes })}'::jsonb);`;

describe.skipIf(!process.env.PGHOST)("multi-vehicle tour reservations", { timeout: 30000 }, () => {
  it("books two vans in one booking when two are free", () => {
    const out = local(2, `${call()} SELECT pg_temp.tour_vehicles_used('${van}', '2026-12-01');`);
    expect(out.split("\n").at(-1)).toBe("2");
  });
  it("refuses two vans when only one is free that day", () => {
    expect(() => local(1, call())).toThrow(/fully booked/);
  });
  it("counts a two-van booking against later single-van bookings", () => {
    const single = { vehicle_count: 1, tour_vehicles: null, passengers: 4, luggage: 2, booking_ref: "SINGLE" };
    expect(() => local(2, `${call()} ${call(single)}`)).toThrow(/fully booked/);
    const out = local(3, `${call()} ${call(single)} SELECT pg_temp.tour_vehicles_used('${van}', '2026-12-01');`);
    expect(out.split("\n").at(-1)).toBe("3");
  });
  it("rejects a vehicle carrying more than its seats", () => {
    const tv = [{ vehicle_class_id: van, passengers: 10, luggage: 8 }, { vehicle_class_id: van, passengers: 2, luggage: 2 }];
    expect(() => local(2, call({ tour_vehicles: tv }))).toThrow(/passengers/);
  });
  it("rejects shares that don't add up to the whole group", () => {
    expect(() => local(2, call({ passengers: 13 }))).toThrow(/incomplete/);
  });
  it("rejects a vehicle count that doesn't match the vehicles", () => {
    expect(() => local(2, call({ vehicle_count: 3 }))).toThrow(/incomplete/);
  });
  it("mixes classes, checking each one's own limits", () => {
    const tv = [{ vehicle_class_id: van, passengers: 8, luggage: 8 }, { vehicle_class_id: saloon, passengers: 4, luggage: 3 }];
    expect(() => local(2, call({ tour_vehicles: tv, luggage: 11 }))).toThrow(/luggage/);
    const ok = [{ vehicle_class_id: van, passengers: 8, luggage: 8 }, { vehicle_class_id: saloon, passengers: 4, luggage: 2 }];
    const out = local(1, `${call({ tour_vehicles: ok })} SELECT count(*) FROM pg_temp.bookings;`);
    expect(out.split("\n").at(-1)).toBe("1");
  });
});
