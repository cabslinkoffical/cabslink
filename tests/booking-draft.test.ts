import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { saveDraft, loadDraft, clearDraft, DRAFT_TTL_MS } from "@/lib/booking-draft";

describe("booking-draft", () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("round-trips allowed fields", () => {
    saveDraft({ pickupLabel: "Edinburgh Airport", passengers: 3, luggage: 2, vehicleSlug: "s-class" });
    const d = loadDraft();
    expect(d).toEqual({ pickupLabel: "Edinburgh Airport", passengers: 3, luggage: 2, vehicleSlug: "s-class" });
  });

  it("strips PII/forbidden keys", () => {
    saveDraft({ pickupLabel: "X", ...({ name: "Jane", email: "j@x.com", phone: "+441", notes: "hi", token: "secret" } as any) });
    const stored = JSON.parse(sessionStorage.getItem("cabslink:booking-draft:v1")!);
    expect(stored.d).toEqual({ pickupLabel: "X" });
  });

  it("expires after TTL", () => {
    saveDraft({ pickupLabel: "X" });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + DRAFT_TTL_MS + 1);
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft removes the key", () => {
    saveDraft({ pickupLabel: "X" });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});
