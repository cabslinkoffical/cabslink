import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "@/routes/sitemap[.]xml";

describe("sitemap public routes", () => {
  const required = [
    "/", "/about", "/services", "/fleet", "/tours", "/contact",
    "/corporate-booking", "/drive-with-us",
    "/booking-policy", "/refund-policy", "/accessibility",
  ];
  it.each(required)("includes %s", (p) => {
    expect(PUBLIC_ROUTES).toContain(p);
  });
  // Phase 5: booking-flow, utility and legal pages stay out of the sitemap.
  it.each(["/book", "/book/hourly", "/book/tour", "/distance", "/privacy", "/terms", "/cookies", "/image-credits"])(
    "excludes %s",
    (p) => {
      expect(PUBLIC_ROUTES).not.toContain(p);
    },
  );
});
