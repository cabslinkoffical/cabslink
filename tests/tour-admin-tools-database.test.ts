import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// The copy and step-by-step save routines from the migration, run against temporary tables.
const migration = readFileSync("drizzle/migrations/0021_tour_admin_tools.sql", "utf8");
const fn = (name: string) => {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  const end = migration.indexOf("$$;", migration.indexOf("AS $$", start) + 5) + 3;
  return migration.slice(start, end)
    .replaceAll("coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin')", "false")
    .replaceAll("public.", "pg_temp.")
    .replace("SET search_path = public", "SET search_path = pg_temp");
};
const src = "11111111-1111-4111-8111-111111111111";
const poiA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const poiB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const van = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function sql(query: string) {
  return execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
function local(query: string) {
  return sql(`BEGIN;
    CREATE TEMP TABLE scenic_route_templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, slug text UNIQUE,
      published boolean DEFAULT false, active boolean DEFAULT false, featured boolean DEFAULT false, theme_group text,
      short_description text, origin_place_id text, default_duration_hours numeric, price_mode text,
      starting_price_pence_cache integer, starting_price_calculated_at timestamptz, starting_price_vehicle_id uuid,
      direct_distance_miles_cache numeric, direct_duration_seconds_cache integer,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TEMP TABLE scenic_route_template_pois (id uuid DEFAULT gen_random_uuid(), route_template_id uuid, poi_id uuid, stop_order integer,
      recommended boolean, default_selected boolean, recommended_visit_minutes integer, mandatory boolean);
    CREATE TEMP TABLE template_fixed_prices (route_template_id uuid, vehicle_class_id uuid, price numeric);
    INSERT INTO pg_temp.scenic_route_templates (id, name, slug, published, active, featured, short_description, starting_price_pence_cache)
      VALUES ('${src}', 'Loch Lomond Day', 'loch-lomond-day', true, true, true, 'Lochs and hills', 28000);
    INSERT INTO pg_temp.scenic_route_template_pois (route_template_id, poi_id, stop_order, recommended, default_selected, recommended_visit_minutes, mandatory)
      VALUES ('${src}', '${poiA}', 1, true, true, 60, true), ('${src}', '${poiB}', 2, false, false, 30, false);
    INSERT INTO pg_temp.template_fixed_prices VALUES ('${src}', '${van}', 450);
    ${fn("admin_duplicate_tour")}
    ${fn("admin_save_tour_draft")}
    ${query}
    ROLLBACK;`);
}
const last = (out: string) => out.split("\n").at(-1);

describe.skipIf(!process.env.PGHOST)("copying a tour", { timeout: 30000 }, () => {
  it("makes an unpublished, switched-off draft with its own address, stops and prices", () => {
    const out = local(`SELECT pg_temp.admin_duplicate_tour('${src}') \\gset
      SELECT name||'|'||slug||'|'||published||'|'||active||'|'||featured||'|'||coalesce(starting_price_pence_cache::text,'none')||'|'||
        (SELECT count(*) FROM pg_temp.scenic_route_template_pois p WHERE p.route_template_id=t.id)||'|'||
        (SELECT price FROM pg_temp.template_fixed_prices f WHERE f.route_template_id=t.id)
      FROM pg_temp.scenic_route_templates t WHERE id <> '${src}';`);
    expect(last(out)).toBe("Loch Lomond Day (copy)|loch-lomond-day-copy|false|false|false|none|2|450");
  });
  it("numbers further copies instead of reusing an address", () => {
    const out = local(`SELECT pg_temp.admin_duplicate_tour('${src}'); SELECT pg_temp.admin_duplicate_tour('${src}');
      SELECT string_agg(slug, ',' ORDER BY slug) FROM pg_temp.scenic_route_templates;`);
    expect(last(out)).toBe("loch-lomond-day,loch-lomond-day-copy,loch-lomond-day-copy-2");
  });
  it("leaves the original tour live and unchanged", () => {
    const out = local(`SELECT pg_temp.admin_duplicate_tour('${src}');
      SELECT published||'|'||active||'|'||(SELECT count(*) FROM pg_temp.scenic_route_template_pois WHERE route_template_id='${src}') FROM pg_temp.scenic_route_templates WHERE id='${src}';`);
    expect(last(out)).toBe("true|true|2");
  });
});

describe.skipIf(!process.env.PGHOST)("step-by-step tour save", { timeout: 30000 }, () => {
  it("creates a new tour as an unpublished draft with its stops in order", () => {
    const out = local(`SELECT pg_temp.admin_save_tour_draft(NULL, '{"name":"New Day","slug":"new-day"}'::jsonb,
        '[{"poi_id":"${poiB}","mandatory":true,"recommended_visit_minutes":45},{"poi_id":"${poiA}","default_selected":false}]'::jsonb, NULL) AS id \\gset
      SELECT t.published||'|'||t.active||'|'||string_agg(p.poi_id::text||':'||p.stop_order||':'||p.mandatory||':'||p.default_selected, ',' ORDER BY p.stop_order)
      FROM pg_temp.scenic_route_templates t JOIN pg_temp.scenic_route_template_pois p ON p.route_template_id=t.id WHERE t.slug='new-day' GROUP BY t.published, t.active;`);
    expect(last(out)).toBe(`false|false|${poiB}:1:true:true,${poiA}:2:false:false`);
  });
  it("keeps stops and prices when they aren't sent", () => {
    const out = local(`SELECT pg_temp.admin_save_tour_draft('${src}', '{"short_description":"New words"}'::jsonb, NULL, NULL);
      SELECT short_description||'|'||(SELECT count(*) FROM pg_temp.scenic_route_template_pois WHERE route_template_id='${src}')||'|'||(SELECT count(*) FROM pg_temp.template_fixed_prices WHERE route_template_id='${src}')
      FROM pg_temp.scenic_route_templates WHERE id='${src}';`);
    expect(last(out)).toBe("New words|2|1");
  });
  it("refuses the same stop twice", () => {
    expect(() => local(`SELECT pg_temp.admin_save_tour_draft('${src}', '{}'::jsonb, '[{"poi_id":"${poiA}"},{"poi_id":"${poiA}"}]'::jsonb, NULL);`)).toThrow(/only be added once/);
  });
  it("refuses fields it doesn't manage, such as publishing", () => {
    expect(() => local(`SELECT pg_temp.admin_save_tour_draft('${src}', '{"published":true}'::jsonb, NULL, NULL);`)).toThrow(/Invalid tour details/);
  });
  it("refuses a new tour without a name and address", () => {
    expect(() => local(`SELECT pg_temp.admin_save_tour_draft(NULL, '{"name":"Only name"}'::jsonb, NULL, NULL);`)).toThrow(/name and a web address/);
  });
});
