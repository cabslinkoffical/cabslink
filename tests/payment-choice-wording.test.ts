import { describe, expect, it } from "vitest";
import { whatsappBookingHref, WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { isBookingConfirmed, paymentNextStepMessage } from "@/lib/booking-lifecycle";
import { customerReceivedEmail } from "@/lib/email/templates.server";
import { FACT_TEXT } from "@/lib/site-facts";

const ctx = {
  bookingRef: "CL-TEST123",
  status: "new" as const,
  paymentMode: "manual" as const,
  customerName: "Alex",
  customerEmail: "alex@example.com",
  customerPhone: "+447700900123",
  pickupAddress: "Edinburgh Airport",
  dropoffAddress: "St Andrews",
  pickupDate: "2026-12-01",
  pickupTime: "10:00",
  vehicleType: "Executive Saloon",
  passengers: 2,
  luggage: 2,
  meetGreet: false,
  childSeat: false,
  returnJourney: false,
  price: 120,
};

describe("pay another way (cash, bank transfer or other)", () => {
  it("opens WhatsApp on the public number with the booking reference typed in", () => {
    const href = whatsappBookingHref("CL-TEST123");
    expect(WHATSAPP_NUMBER).toBe("443338882991");
    expect(href.startsWith("https://wa.me/443338882991?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1])).toContain("CL-TEST123");
  });

  it("never calls an unpaid New booking confirmed", () => {
    expect(isBookingConfirmed("new")).toBe(false);
    expect(isBookingConfirmed("awaiting_payment")).toBe(false);
    const msg = paymentNextStepMessage("manual", "new");
    expect(msg).toMatch(/received your booking request/i);
    expect(msg.toLowerCase()).not.toContain("is confirmed");
  });

  it("calls a booking confirmed once the admin status is Confirmed", () => {
    expect(isBookingConfirmed("confirmed")).toBe(true);
    expect(paymentNextStepMessage("manual", "confirmed")).toMatch(/your booking is confirmed/i);
  });

  it("unpaid booking email says received, shows the reference and a WhatsApp link", () => {
    const email = customerReceivedEmail(ctx);
    expect(email.subject).toMatch(/We've received your booking request/);
    expect(email.html).toContain("CL-TEST123");
    expect(email.html).toContain("To confirm it straight away, message us on WhatsApp");
    expect(email.html).toContain("https://wa.me/443338882991?text=");
    expect(email.html.toLowerCase()).not.toContain("your booking is confirmed");
  });

  it("confirmed booking email says confirmed and drops the WhatsApp prompt", () => {
    const email = customerReceivedEmail({ ...ctx, status: "confirmed", paymentMode: "online" });
    expect(email.subject).toMatch(/Your booking is confirmed/);
    expect(email.html).not.toContain("To confirm it straight away");
  });

  it("FAQ answer for cash or bank transfer uses the owner's wording", () => {
    expect(FACT_TEXT.payCashOrTransfer).toBe(
      "Yes. Complete your booking, skip the online payment, and message us on WhatsApp or email with your booking reference. We'll confirm your booking and arrange payment.",
    );
  });
});
