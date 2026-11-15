/**
 * "My Customers": everyone who booked or filled in a form on the website,
 * merged into one row per email address. Drivers (dispatch drivers and
 * driver/partner applicants) are always left out. Browser-safe.
 */
export type Consent = "subscribed" | "unsubscribed" | "no_consent";
export type CustomerSource = "booking" | "tour" | "contact" | "corporate" | "custom_tour" | "cancellation" | "change_request";

export const SOURCE_LABELS: Record<CustomerSource, string> = {
  booking: "Booking",
  tour: "Tour enquiry",
  contact: "Contact form",
  corporate: "Corporate enquiry",
  custom_tour: "Custom tour request",
  cancellation: "Cancellation",
  change_request: "Change request",
};

export type MyCustomer = {
  email: string;
  name: string | null;
  phone: string | null;
  firstSeen: string;
  lastSeen: string;
  bookings: number;
  completedBookings: number;
  cancelledBookings: number;
  enquiries: number;
  spend: number;
  lastPickup: string | null;
  sources: CustomerSource[];
  consent: Consent;
  optedInAt: string | null;
  /** Why offers may be sent: ticked the box, or a past booker (UK soft opt-in). Null = never email. */
  basis: LawfulBasis;
  firstBookingAt: string | null;
  lastCompletedPickup: string | null;
  lastMarketingAt: string | null;
  blockedReason: string | null;
};
export type LawfulBasis = "consent" | "soft_opt_in" | null;

export const normEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();

/** True for addresses that belong to drivers or driver applicants. */
export function isDriverMessage(m: { source?: string | null; subject?: string | null }): boolean {
  return m.source === "driver" || /driver|partner application/i.test(String(m.subject ?? ""));
}

type In = {
  bookings: any[]; payments: any[]; messages: any[]; customTours: any[];
  cancellations: any[]; amendments: any[]; contacts: any[]; drivers: any[];
};

export function buildCustomers(i: In): MyCustomer[] {
  const driverEmails = new Set<string>();
  for (const d of i.drivers) if (d.email) driverEmails.add(normEmail(d.email));
  for (const m of i.messages) if (isDriverMessage(m) && m.email) driverEmails.add(normEmail(m.email));

  const paidByBooking = new Map<string, number>();
  for (const p of i.payments) {
    if (!p.booking_id || !["paid", "partial", "refunded"].includes(p.status)) continue;
    paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) ?? 0) + Number(p.amount || 0) - Number(p.refunded_amount || 0));
  }

  const map = new Map<string, MyCustomer & { _nameAt: string; _phoneAt: string }>();
  const touch = (email: unknown, at: string, name: unknown, phone: unknown, source: CustomerSource) => {
    const key = normEmail(email);
    if (!key || !key.includes("@") || driverEmails.has(key)) return null;
    let c = map.get(key);
    if (!c) {
      c = { email: key, name: null, phone: null, firstSeen: at, lastSeen: at, bookings: 0, completedBookings: 0, cancelledBookings: 0, enquiries: 0, spend: 0, lastPickup: null, sources: [], consent: "no_consent", optedInAt: null, basis: null, firstBookingAt: null, lastCompletedPickup: null, lastMarketingAt: null, blockedReason: null, _nameAt: "", _phoneAt: "" };
      map.set(key, c);
    }
    if (at < c.firstSeen) c.firstSeen = at;
    if (at > c.lastSeen) c.lastSeen = at;
    const n = String(name ?? "").trim();
    if (n && at >= c._nameAt) { c.name = n; c._nameAt = at; }
    const ph = String(phone ?? "").trim();
    if (ph && at >= c._phoneAt) { c.phone = ph; c._phoneAt = at; }
    if (!c.sources.includes(source)) c.sources.push(source);
    return c;
  };

  for (const b of i.bookings) {
    const c = touch(b.email, b.created_at, b.customer_name, b.phone, b.service_type === "private_tour" && b.price == null ? "tour" : "booking");
    if (!c) continue;
    c.bookings += 1;
    if (b.status === "completed") {
      c.completedBookings += 1;
      if (b.pickup_date && (!c.lastCompletedPickup || b.pickup_date > c.lastCompletedPickup)) c.lastCompletedPickup = b.pickup_date;
    }
    if (!c.firstBookingAt || b.created_at < c.firstBookingAt) c.firstBookingAt = b.created_at;
    if (b.status === "cancelled" || b.status === "rejected") c.cancelledBookings += 1;
    c.spend = Math.round((c.spend + (paidByBooking.get(b.id) ?? 0)) * 100) / 100;
    if (b.pickup_date && (!c.lastPickup || b.pickup_date > c.lastPickup)) c.lastPickup = b.pickup_date;
  }
  for (const m of i.messages) {
    if (isDriverMessage(m)) continue;
    const src: CustomerSource = m.source === "corporate" ? "corporate" : m.source === "tour" ? "tour" : "contact";
    const c = touch(m.email, m.created_at, m.name, m.phone, src);
    if (c) c.enquiries += 1;
  }
  for (const t of i.customTours) { const c = touch(t.email, t.created_at, t.customer_name, t.phone, "custom_tour"); if (c) c.enquiries += 1; }
  for (const r of i.cancellations) touch(r.email, r.created_at, r.customer_name, r.phone, "cancellation");
  for (const r of i.amendments) touch(r.email, r.created_at, r.customer_name, r.phone, "change_request");

  for (const mc of i.contacts) {
    const c = map.get(normEmail(mc.email));
    if (!c) continue;
    c.consent = mc.unsubscribed_at || mc.suppressed_reason ? "unsubscribed" : mc.opted_in ? "subscribed" : "no_consent";
    c.optedInAt = mc.opted_in_at ?? null;
    c.lastMarketingAt = mc.last_marketing_at ?? null;
    c.blockedReason = mc.suppressed_reason ?? (mc.unsubscribed_at ? "unsubscribed" : null);
  }
  for (const c of map.values()) {
    c.basis = c.consent === "subscribed" ? "consent"
      : c.consent === "no_consent" && c.bookings > c.cancelledBookings ? "soft_opt_in" : null;
  }

  return Array.from(map.values())
    .map(({ _nameAt, _phoneAt, ...c }) => c)
    .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
}

export type CustomerFilter = { q?: string; consent?: "all" | Consent; kind?: "all" | "booked" | "enquiry_only" };

export function filterCustomers(all: MyCustomer[], f: CustomerFilter): MyCustomer[] {
  const term = String(f.q ?? "").trim().toLowerCase().slice(0, 100);
  return all.filter((c) =>
    (!term || [c.name, c.email, c.phone].some((v) => String(v ?? "").toLowerCase().includes(term))) &&
    (!f.consent || f.consent === "all" || c.consent === f.consent) &&
    (!f.kind || f.kind === "all" || (f.kind === "booked" ? c.bookings > 0 : c.bookings === 0)));
}

/** Plain-English reason someone can (or can't) get offers. */
export function basisLabel(c: Pick<MyCustomer, "basis" | "optedInAt" | "firstBookingAt" | "blockedReason">): string {
  if (c.blockedReason) return c.blockedReason === "unsubscribed" ? "Unsubscribed" : `Blocked (${c.blockedReason})`;
  if (c.basis === "consent") return `Ticked offers box${c.optedInAt ? ` on ${c.optedInAt.slice(0, 10)}` : ""}`;
  if (c.basis === "soft_opt_in") return `Past booker${c.firstBookingAt ? ` since ${c.firstBookingAt.slice(0, 10)}` : ""}`;
  return "No permission to email offers";
}

/** Who a campaign audience reaches: opted in or past bookers (soft opt-in), never unsubscribed, blocked or drivers. */
export function campaignAudience(all: MyCustomer[], audience: "all" | "booked" | "not_booked"): MyCustomer[] {
  return all.filter((c) => c.basis !== null &&
    (audience === "all" || (audience === "booked" ? c.bookings > 0 : c.bookings === 0)));
}

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function customersCsv(rows: MyCustomer[]): string {
  const head = ["Name", "Email", "Phone", "Marketing consent", "Consent date", "Bookings", "Completed", "Cancelled", "Enquiries", "Paid (GBP)", "Last pickup", "First seen", "Last seen", "How they found us"];
  const lines = rows.map((c) => [
    c.name, c.email, c.phone,
    c.consent === "subscribed" ? "Yes" : c.consent === "unsubscribed" ? "Unsubscribed" : "No",
    c.optedInAt?.slice(0, 10), c.bookings, c.completedBookings, c.cancelledBookings, c.enquiries,
    c.spend.toFixed(2), c.lastPickup, c.firstSeen.slice(0, 10), c.lastSeen.slice(0, 10),
    c.sources.map((s) => SOURCE_LABELS[s]).join("; "),
  ].map(csvCell).join(","));
  return [head.join(","), ...lines].join("\r\n");
}
