import { describe, it, expect } from "vitest";
import { pickRelatedLinks, rankRelatedContent } from "@/lib/related-links";
const pool = {
  airports: [{ href: "/airports/a", label: "A", lat: 55.9, lng: -3.3 }, { href: "/airports/b", label: "B", lat: 51.5, lng: -0.4 }, { href: "/airports/c", label: "C", lat: 55.8, lng: -4.4 }],
  areas: [{ href: "/areas/x", label: "X", lat: 56, lng: -3 }],
  tours: [{ href: "/tours/t1", label: "T1" }, { href: "/tours/t2", label: "T2" }],
};
describe("related links", () => {
  it("never links a page to itself", () => {
    expect(pickRelatedLinks(pool, "/airports/a/", null, 4).airports.map((l) => l.href)).not.toContain("/airports/a");
  });
  it("orders airports nearest first", () => {
    expect(pickRelatedLinks(pool, "/areas/x", { lat: 55.95, lng: -3.2 }, 2).airports.map((l) => l.href)).toEqual(["/airports/a", "/airports/c"]);
  });
  it("prioritises the same tour theme, limits to three and excludes itself", () => {
    const tours = [
      { href: "/tours/glencoe", label: "Glencoe", theme: "Highlands" },
      { href: "/tours/loch", label: "Loch Lomond", theme: "Lochs" },
      { href: "/tours/west", label: "West Highland", theme: "Highlands" },
      { href: "/tours/castle", label: "Stirling Castle", theme: "Castles" },
      { href: "/tours/fort", label: "Fort William", theme: "Highlands" },
    ];
    expect(rankRelatedContent(tours, "/tours/glencoe", "Glencoe Loch Lomond Stirling Castle", "Highlands").map((p) => p.href)).toEqual(["/tours/fort", "/tours/west", "/tours/castle"]);
  });
  it("does not label an unrelated article as relevant", () => {
    expect(rankRelatedContent([{ href: "/blog/a", label: "London taxi" }], "/areas/oban", "Oban Scotland private travel")).toEqual([]);
  });
});
