import { describe, it, expect } from "vitest";
import {
  customerReceivedEmail,
  adminNewBookingEmail,
  statusChangeEmail,
  normaliseEmail,
  safeSubject,
  type BookingEmailContext,
} from "@/lib/email/templates.server";

const baseCtx: BookingEmailContext = {
  bookingRef: "CL-260710-A7K4",
  status: "new",
  paymentMode: "manual",
  customerName: 'Alice "The Boss" <script>alert(1)</script>',
  customerEmail: "alice@example.com",
  customerPhone: "07700900123",
  pickupAddress: "Edinburgh Airport (EDI)",
  dropoffAddress: "Loughborough",
  pickupDate: "2026-07-10",
  pickupTime: "16:45",
  vehicleType: "Mercedes-Benz V-Class",
  passengers: 3,
  luggage: 3,
  meetGreet: true,
  childSeat: false,
  returnJourney: false,
  distanceMiles: 304.3,
  price: 599.99,
  notes: "<b>Please call on arrival</b>",
};

describe("email templates", () => {
  it("escapes HTML from customer-provided values", () => {
    const { html } = customerReceivedEmail(baseCtx);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<b>Please call on arrival</b>");
  });

  it("uses accurate wording for pending vs confirmed bookings", () => {
    expect(customerReceivedEmail({ ...baseCtx, status: "new" }).subject).toMatch(/request received/i);
    expect(customerReceivedEmail({ ...baseCtx, status: "confirmed" }).subject).toMatch(/confirmed/i);
    expect(customerReceivedEmail({ ...baseCtx, status: "new" }).text.toLowerCase()).not.toContain("card charged");
    expect(customerReceivedEmail({ ...baseCtx, status: "new" }).text.toLowerCase()).not.toContain("payment successful");
  });

  it("never leaks internal identifiers", () => {
    const { html, text } = customerReceivedEmail(baseCtx);
    for (const forbidden of ["ChIJ", "place_id", "idempotency", "confirmation_token_hash", "booking-id-"]) {
      expect(html.toLowerCase()).not.toContain(forbidden.toLowerCase());
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it("admin email includes the customer contact info", () => {
    const { html } = adminNewBookingEmail(baseCtx);
    expect(html).toContain("alice@example.com");
    expect(html).toContain("07700900123");
  });

  it("status-change email includes cancellation reason when provided", () => {
    const { html, text } = statusChangeEmail({ ...baseCtx, status: "cancelled", cancellationReason: "Driver unavailable" });
    expect(html).toContain("Driver unavailable");
    expect(text).toContain("Driver unavailable");
  });

  it("normaliseEmail rejects header-injection characters and empty input", () => {
    expect(() => normaliseEmail("")).toThrow();
    expect(() => normaliseEmail("evil@example.com\nBcc: victim@example.com")).toThrow();
    expect(() => normaliseEmail("no-at-sign")).toThrow();
    expect(normaliseEmail("  Alice@Example.com  ")).toBe("alice@example.com");
  });

  it("safeSubject strips CR/LF and truncates", () => {
    expect(safeSubject("Hello\r\nBcc: attacker@example.com")).not.toMatch(/[\r\n]/);
    expect(safeSubject("x".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});
