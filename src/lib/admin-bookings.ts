/**
 * Booking list tabs for the staff console, expressed as database filters so
 * each tab can be loaded one page at a time with a correct total.
 * Browser-safe (no server imports).
 */
import { sanitizeSearch } from "@/lib/admin-paging";
import { TOUR_SERVICE_TYPE } from "@/lib/tour-enquiries";

export const BOOKING_TABS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "new", label: "New" },
  { id: "awaiting_payment", label: "Awaiting payment" },
  { id: "confirmed", label: "Confirmed" },
  { id: "assigned", label: "Driver assigned" },
  { id: "on_road", label: "On the road" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "history", label: "History (past)" },
  { id: "deleted", label: "Deleted" },
] as const;

export type BookingTabId = (typeof BOOKING_TABS)[number]["id"];

export const BOOKING_SEARCH_COLUMNS = [
  "customer_name", "email", "phone", "booking_ref", "pickup_address", "dropoff_address", "vehicle_type",
];

const CLOSED = ["cancelled", "rejected"];
const FINAL = ["completed", "cancelled", "rejected"];

/** Minimal PostgREST builder surface used here (lets tests record calls). */
export interface FilterBuilder<Q> {
  eq(col: string, v: unknown): Q;
  neq(col: string, v: unknown): Q;
  in(col: string, v: unknown[]): Q;
  not(col: string, op: string, v: unknown): Q;
  is(col: string, v: null): Q;
  gte(col: string, v: unknown): Q;
  lt(col: string, v: unknown): Q;
  or(expr: string): Q;
}

export function isBookingTab(t: unknown): t is BookingTabId {
  return BOOKING_TABS.some((x) => x.id === t);
}

/**
 * Applies the tab and search filters. Tour enquiries are excluded unless
 * `includeTours` (they have their own view). `today` is the YYYY-MM-DD date used for upcoming/history.
 */
export function applyBookingFilters<Q extends FilterBuilder<Q>>(q: Q, tabIn: string, search: string, today: string, includeTours = false): Q {
  const tab: BookingTabId = isBookingTab(tabIn) ? tabIn : "all";
  if (!includeTours) q = q.neq("service_type", TOUR_SERVICE_TYPE);
  q = tab === "deleted" ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  const term = sanitizeSearch(search);
  const searchExpr = term ? `or(${BOOKING_SEARCH_COLUMNS.map((c) => `${c}.ilike.*${term}*`).join(",")})` : null;

  if (tab === "history") {
    // Past pickups or finished bookings — an OR, combined with search in one expression.
    const hist = `or(pickup_date.lt.${today},status.in.(${FINAL.join(",")}))`;
    return q.or(searchExpr ? `and(${hist},${searchExpr})` : hist.slice(3, -1));
  }
  if (searchExpr) q = q.or(searchExpr.slice(3, -1));

  if (tab === "deleted") return q;
  if (tab === "cancelled") return q.in("status", CLOSED);
  q = q.not("status", "in", `(${CLOSED.join(",")})`);
  switch (tab) {
    case "upcoming": return q.gte("pickup_date", today).neq("status", "completed");
    case "new": return q.in("status", ["new", "pending_allocation", "bidding"]);
    case "awaiting_payment": return q.eq("status", "awaiting_payment");
    case "confirmed": return q.eq("status", "confirmed");
    case "assigned": return q.eq("status", "assigned");
    case "on_road": return q.in("status", ["driver_en_route", "on_way", "passenger_on_board", "in_progress"]);
    case "completed": return q.eq("status", "completed");
    default: return q;
  }
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
