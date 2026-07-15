import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { saveDraft, loadDraft, clearDraft, sanitizeDraft, DRAFT_TTL_MS } from "@/lib/booking-draft";

describe("booking-draft", () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("round-trips allowed fields (immediate flush)", () => {
    saveDraft({ pickupLabel: "Edinburgh Airport", passengers: 3, luggage: 2, vehicleSlug: "s-class", step: "extras" }, 0);
    const d = loadDraft();
    expect(d).toEqual({ pickupLabel: "Edinburgh Airport", passengers: 3, luggage: 2, vehicleSlug: "s-class", step: "extras" });
  });

  it("strips every forbidden PII/payment key", () => {
    saveDraft({
      pickupLabel: "X",
      ...({ name: "Jane", email: "j@x.com", phone: "+441", notes: "hi", token: "secret",
            cardNumber: "4111", cvv: "111", flight_number: "BA1", payment: "card" } as any),
    }, 0);
    const stored = JSON.parse(sessionStorage.getItem("cabslink:booking-draft:v2")!);
    expect(stored.d).toEqual({ pickupLabel: "X" });
  });

  it("expires after TTL", () => {
    saveDraft({ pickupLabel: "X" }, 0);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + DRAFT_TTL_MS + 1);
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft removes the key and cancels pending write", () => {
    saveDraft({ pickupLabel: "X" }, 0);
    saveDraft({ pickupLabel: "Y" }, 500); // pending
    clearDraft();
    // Flush would have written "Y" if the timer wasn't cancelled.
    return new Promise((r) => setTimeout(r, 600)).then(() => {
      expect(loadDraft()).toBeNull();
    });
  });

  it("sanitizeDraft drops unknown vehicleSlug and resets step to vehicle", () => {
    const cleaned = sanitizeDraft(
      { vehicleSlug: "ghost", step: "extras", passengers: 2 },
      ["s-class", "v-class"],
    );
    expect(cleaned.vehicleSlug).toBeUndefined();
    expect(cleaned.step).toBe("vehicle");
    expect(cleaned.passengers).toBe(2);
  });

  it("sanitizeDraft clears identical pickup/dropoff", () => {
    const cleaned = sanitizeDraft(
      { pickupPlaceId: "abc", pickupLabel: "A", dropoffPlaceId: "abc", dropoffLabel: "A" },
      [],
    );
    expect(cleaned.pickupPlaceId).toBeUndefined();
    expect(cleaned.dropoffPlaceId).toBeUndefined();
  });

  it("debounced writes coalesce", async () => {
    saveDraft({ passengers: 1 }, 50);
    saveDraft({ passengers: 2 }, 50);
    saveDraft({ passengers: 3 }, 50);
    await new Promise((r) => setTimeout(r, 100));
    const d = loadDraft();
    expect(d?.passengers).toBe(3);
  });
});
