/** Tour enquiries arrive through the contact_messages table but belong to the
 * bookings console, not the Messages inbox. This shared predicate keeps both
 * screens in sync. */
export type EnquiryLike = { subject?: string | null; message?: string | null };

export const TOUR_STATUSES = [
  "new",
  "read",
  "pending",
  "booked",
  "paid",
  "confirmed",
  "resolved",
  "cancelled",
] as const;

export type TourBookingStatus = (typeof TOUR_STATUSES)[number];

export const TOUR_STATUS_LABELS: Record<TourBookingStatus, string> = {
  new: "New",
  read: "Read",
  pending: "Pending",
  booked: "Booked",
  paid: "Paid",
  confirmed: "Confirmed",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export function tourStatusLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return TOUR_STATUS_LABELS[s as TourBookingStatus] ?? s.replace(/_/g, " ");
}

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
