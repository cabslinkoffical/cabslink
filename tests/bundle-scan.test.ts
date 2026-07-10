import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * Build-time guard: server-only credential NAMES must never appear in the
 * generated browser bundles. Any injected FORBIDDEN_VALUES must also be
 * absent. We build fresh in a scanning-only mode: dummy secrets injected as
 * env vars are treated as sentinel values. If a real secret happens to be
 * present in the environment we scan for it too, without ever printing it.
 */
const FORBIDDEN_NAMES = [
  "GOOGLE_MAPS_API_KEY",
  "LOVABLE_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "X-Connection-Api-Key",
];

// Deterministic dummy values used to make value-scanning meaningful even when
// no real secrets exist in the CI env. The build below is invoked with these
// as env vars so any accidental client leak would embed them.
const DUMMY_SECRETS: Record<string, string> = {
  GOOGLE_MAPS_API_KEY: "DUMMY_GMAPS_KEY__" + "a".repeat(24),
  LOVABLE_API_KEY: "DUMMY_LOVABLE_KEY__" + "b".repeat(24),
  SUPABASE_SERVICE_ROLE_KEY: "DUMMY_SR_KEY__" + "c".repeat(24),
};

const CLIENT_DIRS = [".output/public", "dist/client", "dist"];

function findClientDir(): string | null {
  for (const d of CLIENT_DIRS) if (existsSync(d) && statSync(d).isDirectory()) return d;
  return null;
}

beforeAll(() => {
  // Always clean and rebuild so we never scan a stale bundle from a
  // previous unrelated build. Injects deterministic dummy secrets so the
  // value-scan is meaningful even if the CI env is missing real ones.
  execSync("rm -rf .output dist", { stdio: "inherit" });
  execSync("bun run build", {
    stdio: "inherit",
    timeout: 420_000,
    env: { ...process.env, ...DUMMY_SECRETS },
  });
}, 480_000);

describe("browser bundle secret scan", () => {
  it("build output exists and does not embed server-only credential names or values", () => {
    const dir = findClientDir();
    expect(dir, "client build output not found — production build must succeed first").not.toBeNull();

    const allowedExt = /\.(js|mjs|cjs|map|html|css|json|txt)$/;
    const files = walk(dir!).filter((f) => allowedExt.test(f));
    // A trivial no-build scan must not pass: require real bundle content.
    expect(files.length, "no client bundle files scanned").toBeGreaterThan(0);
    const totalBytes = files.reduce((s, f) => s + statSync(f).size, 0);
    expect(totalBytes, "client bundle is suspiciously small").toBeGreaterThan(10_000);

    const realValues = Object.entries(DUMMY_SECRETS)
      .map(([k]) => process.env[k])
      .filter((v): v is string => typeof v === "string" && v.length >= 16 && !v.startsWith("DUMMY_"));

    const scanValues = [...Object.values(DUMMY_SECRETS), ...realValues];

    const leaks: string[] = [];
    for (const f of files) {
      const contents = readFileSync(f, "utf8");
      for (const name of FORBIDDEN_NAMES) {
        if (contents.includes(name)) leaks.push(`${f}: name ${name}`);
      }
      for (const val of scanValues) {
        if (contents.includes(val)) leaks.push(`${f}: value <redacted>`);
      }
    }
    expect(leaks, `Client bundle contains server secrets:\n${leaks.join("\n")}`).toEqual([]);
  });
});
