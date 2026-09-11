/**
 * Tour enquiries follow the same lifecycle as transfer bookings: they are
 * rows in `bookings` with `service_type = "private_tour"`, so they get a
 * reference, a payment status, Manage Booking tracking and the shared
 * cancellation flow. Only the wording differs, and it lives here.
 */
import type { BookingStatus } from "@/lib/booking-lifecycle";

export const TOUR_SERVICE_TYPE = "private_tour";

/** Statuses staff pick by hand on a tour enquiry, in journey order. */
export const TOUR_STATUSES = [
  "new",
  "awaiting_payment",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type TourEnquiryStatus = (typeof TOUR_STATUSES)[number];

export const TOUR_STATUS_LABELS: Record<TourEnquiryStatus, string> = {
  new: "Enquiry received",
  awaiting_payment: "Confirmed – awaiting payment",
  confirmed: "Paid & confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Customer-facing wording for a tour enquiry status (any booking status). */
export function tourStatusLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return (
    TOUR_STATUS_LABELS[s as TourEnquiryStatus] ??
    (s === "rejected" ? "Declined" : s.replace(/_/g, " "))
  );
}

export function isTourBookingStatus(s: string): s is TourEnquiryStatus {
  return (TOUR_STATUSES as readonly string[]).includes(s);
}

/** Whether a row from `bookings` is a tour enquiry. */
export function isTourEnquiry(row: { service_type?: string | null }): boolean {
  return (row.service_type ?? "") === TOUR_SERVICE_TYPE;
}

/** Best-effort display name for a tour enquiry. */
export function tourNameFrom(row: {
  tour_name?: string | null;
  notes?: string | null;
}): string {
  const name = (row.tour_name ?? "").trim();
  if (name) return name;
  const line = (row.notes ?? "").split("\n")[0] ?? "";
  const m = line.match(/TOUR ENQUIRY —\s*(.+?)(\s*\(|$)/i);
  return (m?.[1] ?? "").trim() || "Tour enquiry";
}

/** The next status a price quote moves an enquiry into. */
export const TOUR_QUOTED_STATUS: BookingStatus = "awaiting_payment";
