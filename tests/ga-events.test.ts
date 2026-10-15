import { describe, it, expect, beforeEach, vi } from "vitest";

// The consent module is stubbed so loadTag can run in the arguments-object test.
vi.mock("@/lib/consent", () => ({
  analyticsAllowed: vi.fn().mockResolvedValue(true),
  readConsent: vi.fn().mockReturnValue("granted"),
  onConsentChange: vi.fn(),
}));

type W = Window & { gtag?: (...a: unknown[]) => void; __gaLoaded?: boolean };

describe("GA4 event helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY", "G-TEST");
    delete (window as W).gtag;
    delete (window as W).__gaLoaded;
    localStorage.clear();
  });

  it("does nothing until the tag is loaded", async () => {
    const { trackEvent } = await import("@/lib/analytics-ga");
    const calls: unknown[][] = [];
    (window as W).gtag = (...a) => void calls.push(a);
    trackEvent("view_quote", { value: 10 });
    expect(calls).toEqual([]);
  });

  it("sends once loaded and strips personal keys", async () => {
    const { trackEvent } = await import("@/lib/analytics-ga");
    const calls: unknown[][] = [];
    (window as W).gtag = (...a) => void calls.push(a);
    (window as W).__gaLoaded = true;
    trackEvent("generate_lead", { form_name: "contact", email: "a@b.c", customer_name: "X" });
    expect(calls).toEqual([["event", "generate_lead", { form_name: "contact" }]]);
  });

  it("sends purchase only once per booking reference", async () => {
    const { trackPurchaseOnce } = await import("@/lib/analytics-ga");
    const calls: unknown[][] = [];
    (window as W).gtag = (...a) => void calls.push(a);
    (window as W).__gaLoaded = true;
    expect(trackPurchaseOnce("CL-261015-ABCDEFGH", { value: 50 })).toBe(true);
    expect(trackPurchaseOnce("CL-261015-ABCDEFGH", { value: 50 })).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0]![2]).toMatchObject({ transaction_id: "CL-261015-ABCDEFGH", currency: "GBP", value: 50 });
  });

  it("queues gtag commands as the native arguments object, not a plain array", async () => {
    delete (window as W).__gaConsentBound;
    const { initAnalytics } = await import("@/lib/analytics-ga");
    initAnalytics("/");
    const stubbed = (window as W).gtag!;
    expect(stubbed).toBeTypeOf("function");
    // A command through the stub must land in dataLayer as `arguments`
    // (gtag.js ignores plain arrays pushed by a rest-parameter function).
    stubbed("event", "test_event", { value: 1 });
    const dl = (window as unknown as { dataLayer: unknown[] }).dataLayer;
    const last = dl[dl.length - 1];
    expect(Object.prototype.toString.call(last)).toBe("[object Arguments]");
    expect(Array.from(last as unknown as unknown[])).toEqual(["event", "test_event", { value: 1 }]);
    // The config + page_view queued during init must also be arguments objects.
    expect(Object.prototype.toString.call(dl[0])).toBe("[object Arguments]");
  });
});
