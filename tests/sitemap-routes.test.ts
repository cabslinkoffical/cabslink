import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "@/routes/sitemap[.]xml";

describe("sitemap public routes", () => {
  const required = [
    "/", "/about", "/services", "/fleet", "/tours", "/contact", "/book",
    "/corporate-booking", "/drive-with-us",
    "/privacy", "/terms", "/cookies",
    "/booking-policy", "/refund-policy", "/accessibility",
  ];
  it.each(required)("includes %s", (p) => {
    expect(PUBLIC_ROUTES).toContain(p);
  });
});
