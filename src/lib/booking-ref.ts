/**
 * Booking reference format: CL-YYMMDD-XXXXXXXX (8-char suffix, current) or
 * the legacy CL-YYMMDD-XXXX (4-char suffix), which must stay valid.
 */
export const BOOKING_REF_RE = /^CL-\d{6}-(?:[A-Z0-9]{4}|[A-Z0-9]{8})$/;
export const NEW_BOOKING_REF_RE = /^CL-\d{6}-[A-HJ-NP-Z2-9]{8}$/;

export function isValidBookingRef(ref: string): boolean {
  return BOOKING_REF_RE.test((ref ?? "").trim().toUpperCase());
}
