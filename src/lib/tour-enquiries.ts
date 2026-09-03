/** Tour enquiries arrive through the contact_messages table but belong to the
 * bookings console, not the Messages inbox. This shared predicate keeps both
 * screens in sync. */
export type EnquiryLike = { subject?: string | null; message?: string | null };

export function isTourEnquiry(m: EnquiryLike): boolean {
  const subject = (m.subject ?? "").toLowerCase();
  const body = (m.message ?? "").toLowerCase();
  return subject.startsWith("tour booking:") || body.includes("tour enquiry");
}

/** Best-effort tour name from the enquiry subject ("Tour booking: X"). */
export function tourNameFrom(m: EnquiryLike): string {
  const subject = m.subject ?? "";
  const idx = subject.indexOf(":");
  return idx >= 0 ? subject.slice(idx + 1).trim() : subject || "Tour enquiry";
}
