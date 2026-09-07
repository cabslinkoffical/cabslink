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


export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function statusLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return STATUS_META[s as BookingStatus]?.label ?? s.replace(/_/g, " ");
}

export type PaymentMode = "manual" | "pay_later" | "online";

export function paymentNextStepMessage(mode: PaymentMode, status: BookingStatus): string {
  if (mode === "online" && status === "confirmed") {
    return "Payment received. Your driver will be in touch shortly.";
  }
  if (status === "cancelled") {
    return "This booking has been cancelled. Please get in touch if you need help.";
  }
  if (status === "rejected") {
    return "We were unable to accept this booking. Please get in touch if you need help.";
  }
  if (status === "completed") {
    return "Journey complete. Thank you for riding with us.";
  }
  return "Your booking request has been received. Our team will confirm availability and payment arrangements by email or phone.";
}
