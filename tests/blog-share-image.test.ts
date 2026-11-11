import { describe, it, expect } from "vitest";
import { blogShareImage } from "@/lib/blog-share-image";

const FEATURED = "https://cabslink.com/__l5e/assets-v1/abc/blog-x.jpg";
describe("blog share image", () => {
  it("drops a stale /tours/ path and uses the featured image", () => {
    expect(blogShareImage("https://cabslink.com/tours/safari-family.jpg", FEATURED)).toBe(FEATURED);
  });
  it("falls back to the site default when nothing usable is saved", () => {
    expect(blogShareImage("/tours/x.jpg", null)).toBe("https://cabslink.com/og-image.jpg");
  });
  it("keeps a valid saved share image", () => {
    expect(blogShareImage("/__l5e/assets-v1/def/share.jpg", FEATURED)).toBe("https://cabslink.com/__l5e/assets-v1/def/share.jpg");
  });
});
