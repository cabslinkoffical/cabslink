import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "node:fs";

/**
 * Build-time guard: server-only credential NAMES and (when known) VALUES must
 * never appear in the generated browser bundles. Runs `vite build` once and
 * greps the client asset directory. Longer timeout because it triggers a full
 * production build.
 */

// The build emits client assets under `.output/public/` for the Cloudflare
// worker target. Any of these substrings appearing there is a leak.
const FORBIDDEN_NAMES = [
  "GOOGLE_MAPS_API_KEY",
  "LOVABLE_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "X-Connection-Api-Key",
];

const FORBIDDEN_VALUES = [
  process.env.GOOGLE_MAPS_API_KEY,
  process.env.LOVABLE_API_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
].filter((v): v is string => typeof v === "string" && v.length >= 12);

const CLIENT_DIRS = [".output/public", "dist/client", "dist"];

function findClientDir(): string | null {
  for (const d of CLIENT_DIRS) if (existsSync(d) && statSync(d).isDirectory()) return d;
  return null;
}

beforeAll(() => {
  if (!findClientDir()) {
    execSync("bun run build", { stdio: "inherit", timeout: 300_000 });
  }
}, 320_000);

describe("browser bundle secret scan", () => {
  it("does not embed server-only credential names or values", () => {
    const dir = findClientDir();
    expect(dir, "client build output not found").not.toBeNull();

    const files = globSync(join(dir!, "**/*.{js,mjs,cjs,map,html,css,json,txt}"));
    expect(files.length).toBeGreaterThan(0);

    const leaks: string[] = [];
    for (const f of files) {
      const contents = readFileSync(f, "utf8");
      for (const name of FORBIDDEN_NAMES) {
        if (contents.includes(name)) leaks.push(`${f}: name ${name}`);
      }
      for (const val of FORBIDDEN_VALUES) {
        if (contents.includes(val)) leaks.push(`${f}: value <redacted>`);
      }
    }
    expect(leaks, `Client bundle contains server secrets:\n${leaks.join("\n")}`).toEqual([]);
  });
});
