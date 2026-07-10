import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  customerReceivedEmail,
  adminNewBookingEmail,
  statusChangeEmail,
  normaliseEmail,
  safeSubject,
  type BookingEmailContext,
} from "@/lib/email/templates.server";
import { getEmailAdapter, _setEmailAdapterForTests, type EmailAdapter } from "@/lib/email/adapter.server";

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

  it("status-change emails render for every prepared operational status", () => {
    for (const s of ["confirmed", "assigned", "driver_en_route", "completed", "cancelled", "rejected"] as const) {
      const { html, text, subject } = statusChangeEmail({ ...baseCtx, status: s, cancellationReason: "Reason X" });
      expect(subject).toMatch(/Booking/i);
      expect(html.length).toBeGreaterThan(200);
      expect(text.length).toBeGreaterThan(60);
      expect(html).not.toContain("<script>");
    }
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

describe("email adapter — not-configured state", () => {
  beforeEach(() => _setEmailAdapterForTests(null));

  it("default adapter reports not configured and never claims success", async () => {
    const a = getEmailAdapter();
    expect(a.configured).toBe(false);
    const res = await a.send({ to: "x@example.com", subject: "s", html: "<p>h</p>", text: "t" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errorCategory).toBe("config_missing");
    // Must NOT invent a provider id.
    expect((res as any).providerMessageId ?? null).toBeNull();
  });

  it("test injection allows a configured adapter", async () => {
    const spy = vi.fn(async () => ({ ok: true as const, providerMessageId: "msg_1" }));
    const fake: EmailAdapter = { name: "test", configured: true, send: spy };
    _setEmailAdapterForTests(fake);
    const a = getEmailAdapter();
    expect(a.configured).toBe(true);
    const res = await a.send({ to: "x@example.com", subject: "s", html: "<p>h</p>", text: "t" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.providerMessageId).toBe("msg_1");
    _setEmailAdapterForTests(null);
  });
});
