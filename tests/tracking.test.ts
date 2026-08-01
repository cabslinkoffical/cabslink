import { describe, it, expect, beforeEach } from "vitest";
import { track, trackClick } from "@/lib/tracking";

type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

describe("conversion tracking", () => {
  beforeEach(() => {
    delete (window as W).dataLayer;
    delete (window as W).gtag;
  });

  it("pushes the event onto dataLayer", () => {
    track("quote_start", { pickup: "Edinburgh", passengers: 2 });
    expect((window as W).dataLayer).toEqual([
      { event: "quote_start", pickup: "Edinburgh", passengers: 2 },
    ]);
  });

  it("drops undefined payload keys", () => {
    track("cta_click", { cta: "hero", label: undefined });
    expect((window as W).dataLayer?.[0]).toEqual({ event: "cta_click", cta: "hero" });
  });

  it("forwards to gtag when a tag is present", () => {
    const calls: unknown[][] = [];
    (window as W).gtag = (...a: unknown[]) => void calls.push(a);
    track("phone_click", { source: "final_cta" });
    expect(calls).toEqual([["event", "phone_click", { source: "final_cta" }]]);
  });

  it("trackClick returns a handler that records once per call", () => {
    const handler = trackClick("whatsapp_click", { path: "/" });
    handler();
    handler();
    expect((window as W).dataLayer).toHaveLength(2);
  });

  it("never throws when dataLayer is hostile", () => {
    Object.defineProperty(window, "dataLayer", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(() => track("quote_start")).not.toThrow();
  });
});
