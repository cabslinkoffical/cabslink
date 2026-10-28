import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const migration = readFileSync("drizzle/migrations/0005_atomic_tour_capacity_reservation.sql", "utf8");
const functionSql = migration.slice(0, migration.indexOf("REVOKE EXECUTE"));
const classId = "11111111-1111-4111-8111-111111111111";
const templateId = "22222222-2222-4222-8222-222222222222";
const payload = { vehicle_class_id: classId, pickup_date: "2026-12-01", passengers: 4, luggage: 3,
  booked_hours: 4, service_type: "private_tour", status: "pending_payment", booking_ref: "TEST" };
function sql(query: string) {
  return execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
function fixtures(schema: string) {
  return `CREATE TABLE ${schema}.vehicle_classes (id uuid PRIMARY KEY, active boolean, max_passengers integer, passengers integer,
    max_luggage integer, large_luggage integer, min_hours numeric, max_hours numeric);
    CREATE TABLE ${schema}.scenic_route_templates (id uuid PRIMARY KEY, active boolean, published boolean, is_bookable boolean);
    CREATE TABLE ${schema}.vehicle_class_daily_capacity (vehicle_class_id uuid PRIMARY KEY, max_tours_per_day integer);
    CREATE TABLE ${schema}.bookings (id uuid DEFAULT gen_random_uuid(), vehicle_class_id uuid, pickup_date date, passengers integer,
      luggage integer, booked_hours numeric, service_type text, status text, booking_ref text, scenic_template_id uuid);
    INSERT INTO ${schema}.vehicle_classes VALUES ('${classId}',true,4,4,3,3,3,8);
    INSERT INTO ${schema}.vehicle_class_daily_capacity VALUES ('${classId}',1);
    INSERT INTO ${schema}.scenic_route_templates VALUES ('${templateId}',true,true,true);
    ${functionSql.replaceAll("public.", `${schema}.`).replace("SET search_path = public", `SET search_path = ${schema}`)}`;
}
function call(schema: string, changes: Record<string, unknown> = {}) {
  return `SELECT ${schema}.reserve_tour_booking('${JSON.stringify({ ...payload, ...changes })}'::jsonb);`;
}
function local(query: (schema: string) => string) {
  const schema = `tour_test_${randomUUID().replaceAll("-", "")}`;
  return sql(`BEGIN; CREATE SCHEMA ${schema}; ${fixtures(schema)} ${query(schema)} ROLLBACK;`);
}
function concurrent(query: string): Promise<{ code: number | null; error: string }> {
  return new Promise((resolve) => {
    const child = spawn("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
    let error = "";
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("close", (code) => resolve({ code, error }));
    child.stdin.end(query);
  });
}
describe.skipIf(!process.env.PGHOST)("atomic tour reservation database rules", () => {
  it("inserts the last slot and preserves defaults", () => {
    const output = local((schema) => `${call(schema)} SELECT count(*), bool_and(id IS NOT NULL) FROM ${schema}.bookings;`);
    expect(output.split("\n").at(-1)).toBe("1|t");
  });
  it("rejects the next booking when the cap has been reached", () => {
    expect(() => local((schema) => `${call(schema)} ${call(schema, { booking_ref: "NEXT" })}`)).toThrow(/fully booked/);
  });
  it.each([
    [{ passengers: 5 }, /passengers/], [{ luggage: 4 }, /luggage/],
    [{ booked_hours: 2 }, /duration/], [{ booked_hours: 9 }, /duration/],
  ])("enforces class bounds at the locked insert: %j", (changes, error) => {
    expect(() => local((schema) => call(schema, changes))).toThrow(error);
  });
  it.each(["active", "published", "is_bookable"])("rejects a template with %s false at insertion", (flag) => {
    expect(() => local((schema) => `UPDATE ${schema}.scenic_route_templates SET ${flag}=false; ${call(schema, { scenic_template_id: templateId })}`)).toThrow(/not available/);
  });
  it("two simultaneous customers cannot both take the last slot", async () => {
    const schema = `tour_race_${randomUUID().replaceAll("-", "")}`;
    sql(`CREATE SCHEMA ${schema}; ${fixtures(schema)}`);
    try {
      const results = await Promise.all([
        concurrent(`BEGIN; ${call(schema, { booking_ref: "FIRST" })} SELECT pg_sleep(0.5); COMMIT;`),
        concurrent(`BEGIN; ${call(schema, { booking_ref: "SECOND" })} SELECT pg_sleep(0.5); COMMIT;`),
      ]);
      expect(results.filter((r) => r.code === 0)).toHaveLength(1);
      expect(results.filter((r) => /fully booked/.test(r.error))).toHaveLength(1);
      expect(sql(`SELECT count(*) FROM ${schema}.bookings;`)).toBe("1");
    } finally { sql(`DROP SCHEMA ${schema} CASCADE;`); }
  }, 30000);
});