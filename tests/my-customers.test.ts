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
  it("only subscribed customers receive campaigns", () => {
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
