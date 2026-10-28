import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const migration = readFileSync("drizzle/migrations/0004_server_only_submissions_and_coupon_columns.sql", "utf8");
const routine = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION"), migration.indexOf("REVOKE EXECUTE"))
  .replaceAll("public.", "pg_temp.");

describe.skipIf(!process.env.PGHOST)("coupon redemption real database routine", () => {
  it("records email and amount and increments usage without deleting a valid booking", () => {
    const result = execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { encoding: "utf8", input: `BEGIN;
      CREATE TEMP TABLE coupons (id uuid PRIMARY KEY, usage_limit integer, used_count integer);
      CREATE TEMP TABLE coupon_redemptions (coupon_id uuid, booking_id uuid UNIQUE, email text, amount numeric);
      INSERT INTO coupons VALUES ('33333333-3333-4333-8333-333333333333', 10, 0);
      ${routine}
      SELECT pg_temp.redeem_coupon('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', ' ALICE@example.com ', 5);
      SELECT email, amount FROM coupon_redemptions;
      SELECT used_count FROM coupons;
      ROLLBACK;` });
    expect(result.trim()).toBe("t\nalice@example.com|5\n1");
  });
});