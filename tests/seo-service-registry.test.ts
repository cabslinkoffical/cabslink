import { describe, it, expect } from "vitest";
import {
  SERVICE_REGISTRY,
  SEO_REDIRECTS,
  allAliases,
  getService,
  publishedServices,
  serviceLocationPath,
} from "@/lib/seo/service-registry";
import { HOME_TO_HUBS } from "@/lib/internal-links";

describe("canonical service registry", () => {
  it("has unique ids, slugs and urls", () => {
    for (const key of ["id", "slug", "url"] as const) {
      const values = SERVICE_REGISTRY.map((s) => s[key]);
      expect(new Set(values).size, `duplicate ${key}`).toBe(values.length);
    }
  });

  it("never exposes an alias as a canonical slug", () => {
    const slugs = new Set(SERVICE_REGISTRY.map((s) => s.slug));
    for (const alias of allAliases()) {
      expect(slugs.has(alias.replace(/\s+/g, "-"))).toBe(false);
    }
  });

  it("gives every service a distinct intent statement", () => {
    const intents = SERVICE_REGISTRY.map((s) => s.intent.trim().toLowerCase());
    expect(new Set(intents).size).toBe(intents.length);
    for (const s of SERVICE_REGISTRY) expect(s.intent.length).toBeGreaterThan(20);
  });

  it("only marks a service published when its route exists", () => {
    for (const s of publishedServices()) {
      expect(s.routeExists, `${s.id} published without a route`).toBe(true);
    }
  });

  it("builds local child paths from the canonical slug only", () => {
    expect(serviceLocationPath("airport-transfers", "edinburgh")).toBe(
      "/airport-transfers/edinburgh",
    );
    expect(serviceLocationPath("vip-transfers", "edinburgh")).toBeNull();
    expect(getService("nope")).toBeUndefined();
  });

  it("redirects the legacy /locations duplicate to /areas", () => {
    expect(SEO_REDIRECTS).toEqual(
      expect.arrayContaining([{ from: "/locations/:slug", to: "/areas/:slug", statusCode: 301 }]),
    );
  });
});

describe("hub links", () => {
  it("links to the /routes hub now that journey pages are published", () => {
    expect(HOME_TO_HUBS.map((l) => l.href)).toContain("/routes");
  });
});

