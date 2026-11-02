import { SITE } from "@/lib/site";

/** Digits-only WhatsApp number derived from the single public phone number. */
export const WHATSAPP_NUMBER = SITE.phoneUK.replace(/[^0-9]/g, "");

/** Notes line recorded when a customer chooses to pay off-site. */
export const OFFLINE_PAYMENT_LABEL = "Pay another way (cash, bank transfer or other) — arrange on WhatsApp";

/** Pre-typed WhatsApp message that carries the booking reference. */
export function whatsappBookingMessage(bookingRef: string): string {
  return `Hi ${SITE.name}, my booking reference is ${bookingRef}. I'd like to confirm my booking and arrange payment.`;
}

/** wa.me link that opens a chat with the booking reference already typed. */
export function whatsappBookingHref(bookingRef: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappBookingMessage(bookingRef))}`;
}
