import { describe, expect, it } from "vitest";
import { buildCustomers, campaignAudience, customersCsv } from "@/lib/my-customers";

const base = { bookings: [], payments: [], messages: [], customTours: [], cancellations: [], amendments: [], contacts: [], drivers: [] } as any;

describe("My Customers", () => {
  it("leaves out dispatch drivers and driver applicants everywhere", () => {
    const rows = buildCustomers({
      ...base,
      drivers: [{ email: "Driver@x.com" }],
      bookings: [{ id: "b1", email: "driver@x.com", created_at: "2026-01-01", status: "new" }],
      messages: [
        { email: "applicant@x.com", source: "driver", subject: "Driver / Partner Application", created_at: "2026-01-02" },
        { email: "applicant@x.com", source: "contact", subject: "Hi", created_at: "2026-01-03" },
        { email: "jane@x.com", source: "contact", created_at: "2026-01-04", name: "Jane" },
      ],
    });
    expect(rows.map((r) => r.email)).toEqual(["jane@x.com"]);
  });
  it("merges forms and bookings under one email", () => {
    const [c] = buildCustomers({
      ...base,
      bookings: [{ id: "b1", email: "a@x.com", created_at: "2026-02-01", status: "completed", customer_name: "Ann" }],
      payments: [{ booking_id: "b1", status: "paid", amount: 50, refunded_amount: 0 }],
      messages: [{ email: "A@x.com", source: "contact", created_at: "2026-01-01" }],
    });
    expect(c).toMatchObject({ email: "a@x.com", name: "Ann", bookings: 1, completedBookings: 1, enquiries: 1, spend: 50 });
  });
  it("enquiry-only people need ticked consent to receive campaigns", () => {
    const rows = buildCustomers({
      ...base,
      messages: [{ email: "yes@x.com", created_at: "1" }, { email: "no@x.com", created_at: "1" }, { email: "gone@x.com", created_at: "1" }],
      contacts: [{ email: "yes@x.com", opted_in: true }, { email: "gone@x.com", opted_in: true, unsubscribed_at: "2026" }],
    });
    expect(campaignAudience(rows, "all").map((r) => r.email)).toEqual(["yes@x.com"]);
  });
  it("neutralises spreadsheet formulas in exports", () => {
    const rows = buildCustomers({ ...base, messages: [{ email: "a@x.com", name: "=HYPERLINK(1)", created_at: "1" }] });
    expect(customersCsv(rows)).toContain("'=HYPERLINK(1)");
  });
});

describe("Custom campaign audiences", () => {
  const rows = buildCustomers({
    ...base,
    bookings: [
      { id: "b1", email: "vip@x.com", created_at: "2026-01-01", status: "completed", customer_name: "Vic" },
      { id: "b2", email: "vip@x.com", created_at: "2026-02-01", status: "completed" },
      { id: "b3", email: "once@x.com", created_at: "2026-01-05", status: "completed" },
    ],
    payments: [
      { booking_id: "b1", status: "paid", amount: 300, refunded_amount: 0 },
      { booking_id: "b2", status: "paid", amount: 250, refunded_amount: 0 },
      { booking_id: "b3", status: "paid", amount: 60, refunded_amount: 0 },
    ],
    messages: [{ email: "corp@x.com", source: "corporate", created_at: "2026-03-01" }],
    contacts: [
      { id: "c1", email: "vip@x.com", opted_in: true },
      { id: "c2", email: "once@x.com", opted_in: true },
      { id: "c3", email: "corp@x.com", opted_in: true },
    ],
    contactTags: [{ contact_id: "c1", tag: "VIP" }],
  });
  it("matches every set condition and keeps the permission check", () => {
    expect(campaignAudience(rows, "custom", { min_trips: 2, min_spend: 500 }).map((r) => r.email)).toEqual(["vip@x.com"]);
    expect(campaignAudience(rows, "custom", { booked: "no" }).map((r) => r.email)).toEqual(["corp@x.com"]);
    expect(campaignAudience(rows, "custom", { source: "corporate" }).map((r) => r.email)).toEqual(["corp@x.com"]);
  });
  it("filters by tags and by an explicit email list", () => {
    expect(campaignAudience(rows, "custom", { tags: ["vip"] }).map((r) => r.email)).toEqual(["vip@x.com"]);
    expect(campaignAudience(rows, "custom", { emails: ["Once@X.com", "nobody@x.com"] }).map((r) => r.email)).toEqual(["once@x.com"]);
  });
  it("never emails someone without permission, even when listed by email", () => {
    const withBlocked = buildCustomers({
      ...base,
      bookings: [{ id: "b1", email: "gone@x.com", created_at: "2026-01-01", status: "completed" }],
      contacts: [{ id: "c9", email: "gone@x.com", opted_in: true, unsubscribed_at: "2026-06-01" }],
    });
    expect(campaignAudience(withBlocked, "custom", { emails: ["gone@x.com"] })).toEqual([]);
  });
});
