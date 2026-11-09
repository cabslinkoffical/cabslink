// Client-safe metadata about booking statuses.
// The server enforces valid transitions via the `set_booking_status` DB function.

export const BOOKING_STATUSES = [
  "new",
  "pending_allocation",
  "awaiting_payment",
  "confirmed",
  "assigned",
  "driver_en_route",
  "on_way",
  "passenger_on_board",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
  "bidding",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

type Meta = {
  label: string;
  /** Whether admins can pick this status from the dropdown. */
  adminSelectable: boolean;
  /** Whether a customer notification email should fire on entering this status. */
  notifyCustomer: boolean;
  /** Whether the booking is considered active (not terminal / not cancelled). */
  active: boolean;
  /** Whether entering this status must record a reason. */
  requiresReason: boolean;
  /** Whether this is a terminal state that only an admin override can leave. */
  terminal: boolean;
};

export const STATUS_META: Record<BookingStatus, Meta> = {
  new:                { label: "New",                  adminSelectable: true,  notifyCustomer: false, active: true,  requiresReason: false, terminal: false },
  awaiting_payment:   { label: "Awaiting payment",     adminSelectable: true,  notifyCustomer: false, active: true,  requiresReason: false, terminal: false },
  confirmed:          { label: "Confirmed",            adminSelectable: true,  notifyCustomer: true,  active: true,  requiresReason: false, terminal: false },
  assigned:           { label: "Driver assigned",      adminSelectable: true,  notifyCustomer: true,  active: true,  requiresReason: false, terminal: false },
  driver_en_route:    { label: "Driver en route",      adminSelectable: true,  notifyCustomer: true,  active: true,  requiresReason: false, terminal: false },
  passenger_on_board: { label: "Passenger on board",   adminSelectable: true,  notifyCustomer: false, active: true,  requiresReason: false, terminal: false },
  completed:          { label: "Completed",            adminSelectable: true,  notifyCustomer: true,  active: false, requiresReason: false, terminal: true  },
  cancelled:          { label: "Cancelled",            adminSelectable: true,  notifyCustomer: true,  active: false, requiresReason: true,  terminal: true  },
  rejected:           { label: "Rejected",             adminSelectable: true,  notifyCustomer: true,  active: false, requiresReason: true,  terminal: true  },
  // Legacy / system-only states. They still exist on older rows and in the
  // database enum, so they must render, but staff never pick them by hand
  // because each duplicates one of the statuses above.
  pending_allocation: { label: "Awaiting driver",       adminSelectable: false, notifyCustomer: false, active: true,  requiresReason: false, terminal: false },
  on_way:             { label: "Driver en route",       adminSelectable: false, notifyCustomer: true,  active: true,  requiresReason: false, terminal: false },
  in_progress:        { label: "Passenger on board",    adminSelectable: false, notifyCustomer: false, active: true,  requiresReason: false, terminal: false },
  bidding:            { label: "Out to drivers",        adminSelectable: false, notifyCustomer: false, active: true,  requiresReason: false, terminal: false },
};

/**
 * The only statuses staff choose by hand, in the order a journey actually
 * progresses. Everything else in `STATUS_META` is a legacy alias kept for
 * display of older bookings.
 */
export const ADMIN_STATUS_OPTIONS: BookingStatus[] = [
  "new",
  "awaiting_payment",
  "confirmed",
  "assigned",
  "driver_en_route",
  "passenger_on_board",
  "completed",
  "cancelled",
  "rejected",
];

/** Allowed forward transitions. Kept in sync with the DB `set_booking_status` function. */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new:                ["awaiting_payment", "confirmed", "assigned", "cancelled", "rejected", "pending_allocation"],
  pending_allocation: ["awaiting_payment", "confirmed", "assigned", "cancelled", "rejected"],
  awaiting_payment:   ["confirmed", "assigned", "cancelled", "rejected"],
  pending_payment:    ["awaiting_payment", "confirmed", "cancelled"],
  payment_failed:     ["awaiting_payment", "confirmed", "cancelled"],
  expired:            ["awaiting_payment", "confirmed", "cancelled"],
  confirmed:          ["assigned", "awaiting_payment", "cancelled"],
  assigned:           ["driver_en_route", "on_way", "in_progress", "passenger_on_board", "cancelled", "confirmed"],
  on_way:             ["driver_en_route", "passenger_on_board", "in_progress", "completed", "cancelled"],
  driver_en_route:    ["passenger_on_board", "in_progress", "completed", "cancelled"],
  passenger_on_board: ["in_progress", "completed", "cancelled"],
  in_progress:        ["passenger_on_board", "completed", "cancelled"],
  completed:          [],
  cancelled:          [],
  rejected:           [],
  bidding:            ["assigned", "cancelled", "rejected", "new", "pending_allocation"],
};


/**
 * A booking's status is locked once it is final (completed / cancelled /
 * rejected) or once money has been taken (paid / partially paid). Kept in
 * sync with the DB `set_booking_status` guards.
 */
export function isStatusLocked(status: string | null | undefined, paymentStatus: string | null | undefined): boolean {
  if (status === "completed" || status === "cancelled" || status === "rejected") return true;
  return paymentStatus === "paid" || paymentStatus === "partial";
}

export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function statusLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return STATUS_META[s as BookingStatus]?.label ?? s.replace(/_/g, " ");
}

export type PaymentMode = "manual" | "pay_later" | "online";

/**
 * Statuses that mean the team (or a card payment) has confirmed the booking.
 * Anything before these is only a booking request — never call it confirmed.
 */
export const CONFIRMED_STATUSES: readonly BookingStatus[] = [
  "confirmed", "assigned", "driver_en_route", "on_way", "passenger_on_board", "in_progress",
];

export function isBookingConfirmed(status: string | null | undefined): boolean {
  return !!status && (CONFIRMED_STATUSES as readonly string[]).includes(status);
}

/** True while a booking is still a request the customer can act on (not confirmed, not closed). */
export function isAwaitingConfirmation(status: string | null | undefined): boolean {
  return status === "new" || status === "pending_allocation" || status === "awaiting_payment" || status === "bidding";
}

export function paymentNextStepMessage(mode: PaymentMode, status: BookingStatus): string {
  if (status === "cancelled") {
    return "This booking has been cancelled. Please get in touch if you need help.";
  }
  if (status === "rejected") {
    return "We were unable to accept this booking. Please get in touch if you need help.";
  }
  if (status === "completed") {
    return "Journey complete. Thank you for riding with us.";
  }
  if (isBookingConfirmed(status)) {
    return mode === "online"
      ? "Your booking is confirmed and your card payment has been received. Your driver will be in touch shortly."
      : "Your booking is confirmed. Our team will be in touch about your driver and payment if anything is still due.";
  }
  return "We've received your booking request. To confirm it straight away, message us on WhatsApp with your booking reference, or pay by card from your booking page.";
}
