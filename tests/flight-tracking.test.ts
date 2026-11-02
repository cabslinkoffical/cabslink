import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FACT_TEXT } from "@/lib/site-facts";
import { flightNumberError, isAirportPickup } from "@/lib/flight-number";

describe("flight number rule", () => {
  it("requires a flight number for airport pickups", () => {
    expect(flightNumberError("Edinburgh Airport (EDI), Edinburgh", "")).toBe("Please add your flight number so we can track your flight.");
    expect(flightNumberError("London Heathrow, Terminal 5", "  ")).not.toBeNull();
    expect(flightNumberError("Edinburgh Airport (EDI)", "BA1448")).toBeNull();
  });

  it("keeps it optional for non-airport pickups", () => {
    expect(isAirportPickup("10 Princes Street, Edinburgh")).toBe(false);
    expect(flightNumberError("Edinburgh Waverley Station", "")).toBeNull();
  });
});

describe("flight tracking wording", () => {
  it("uses the owner's sentence", () => {
    expect(FACT_TEXT.flightTracking).toBe(
      "Add your flight number when you book and our team will track your flight and adjust your pickup if it lands early or late.",
    );
  });

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (!/_authenticated|integrations/.test(p)) walk(p); }
      else if (/\.(ts|tsx)$/.test(f) && !p.endsWith("routeTree.gen.ts")) files.push(p);
    }
  };
  walk("src");

  it("never promises more than the team tracking the flight", () => {
    const banned = /live flight tracking|flight monitoring|monitor\w* (your |the )?flight|re-timed automatically|(adjust|shift|move)\w* [^"`]{0,30}automatically|automatic flight|train (and ferry )?tracking|text alerts?/i;
    const hits = files.filter((f) => banned.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
