import { describe, it, expect } from "vitest";
import { bookingRequestHash, canonicalizeBookingInput, type BookingFingerprintInput } from "@/lib/booking-fingerprint";

const base: BookingFingerprintInput = {
  pickupPlaceId: "ChIJ_pickup",
  destinationPlaceId: "ChIJ_dest",
  stops: [{ placeId: "ChIJ_via1" }],
  pickupDate: "2026-08-01",
  pickupTime: "14:00",
  vehicleId: "11111111-1111-1111-1111-111111111111",
  vehicleCount: 1,
  passengers: 2,
  luggage: 1,
  email: "Alice@Example.com",
  phone: "+44 7700 900123",
  returnJourney: false,
  meetGreet: true,
  childSeat: false,
};

describe("bookingRequestHash", () => {
  it("is deterministic and stable across trivial email casing / phone spacing", async () => {
    const a = await bookingRequestHash(base);
    const b = await bookingRequestHash({ ...base, email: "alice@example.com", phone: "+447700900123" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("changes when any authoritative field changes", async () => {
    const h0 = await bookingRequestHash(base);
    const variants: Array<Partial<BookingFingerprintInput>> = [
      { pickupPlaceId: "ChIJ_other" },
      { destinationPlaceId: "ChIJ_other" },
      { stops: [{ placeId: "ChIJ_via2" }] },
      { pickupDate: "2026-08-02" },
      { pickupTime: "15:00" },
      { vehicleId: "22222222-2222-2222-2222-222222222222" },
      { passengers: 3 },
      { luggage: 2 },
      { email: "bob@example.com" },
      { phone: "07777000000" },
      { returnJourney: true },
      { meetGreet: false },
      { childSeat: true },
      { vehicleCount: 2 },
    ];
    for (const v of variants) {
      const h = await bookingRequestHash({ ...base, ...v });
      expect(h, `expected different hash for ${JSON.stringify(v)}`).not.toBe(h0);
    }
  });
  it("does not include client-supplied price or distance", () => {
    const canonical = canonicalizeBookingInput(base);
    expect(canonical).not.toMatch(/price/i);
    expect(canonical).not.toMatch(/distance/i);
  });
});
