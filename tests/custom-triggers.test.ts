import { describe, it, expect } from "vitest";
import { ruleTriggerKey } from "@/lib/email-automation";
import { buildCustomers } from "@/lib/my-customers";

const base = { payments: [], messages: [], customTours: [], cancellations: [], amendments: [], drivers: [], contacts: [] };
const one = (bookings: any[], today = "2026-11-15") => buildCustomers({ ...base, bookings }, today)[0];
const bk = (o: any) => ({ id: Math.random().toString(), email: "a@x.com", customer_name: "A", created_at: "2026-10-01T10:00:00Z", status: "confirmed", ...o });

describe("custom triggers", () => {
  it("before_trip fires 7 days before an upcoming trip, not after it", () => {
    const c = one([bk({ pickup_date: "2026-11-20" })]);
    expect(ruleTriggerKey(c, { trigger_type: "before_trip", delay_days: 7 }, "2026-11-15")).toBe("before:2026-11-20");
    expect(ruleTriggerKey(c, { trigger_type: "before_trip", delay_days: 3 }, "2026-11-15")).toBeNull();
    expect(ruleTriggerKey(c, { trigger_type: "before_trip", delay_days: 7 }, "2026-11-20")).toBeNull();
  });
  it("anniversary fires on the first-booking date a year later", () => {
    const c = one([bk({ created_at: "2025-11-15T10:00:00Z", status: "completed", pickup_date: "2025-11-20" })]);
    expect(ruleTriggerKey(c, { trigger_type: "anniversary", delay_days: 0 }, "2026-11-15")).toBe("anniversary:2026");
    expect(ruleTriggerKey(c, { trigger_type: "anniversary", delay_days: 0 }, "2026-11-14")).toBeNull();
  });
  it("unfinished booking fires, but not once they booked again", () => {
    const c = one([bk({ status: "pending_payment", created_at: "2026-11-14T10:00:00Z" })]);
    expect(ruleTriggerKey(c, { trigger_type: "abandoned_quote", delay_days: 1 }, "2026-11-15")).toBe("unfinished:2026-11-14");
    const c2 = one([bk({ status: "pending_payment", created_at: "2026-11-14T10:00:00Z" }), bk({ created_at: "2026-11-14T12:00:00Z", pickup_date: "2026-12-01" })]);
    expect(ruleTriggerKey(c2, { trigger_type: "abandoned_quote", delay_days: 1 }, "2026-11-15")).toBeNull();
  });
  it("after_cancellation counts from the cancellation day", () => {
    const c = one([bk({ status: "cancelled", updated_at: "2026-11-01T10:00:00Z" })]);
    expect(ruleTriggerKey(c, { trigger_type: "after_cancellation", delay_days: 14 }, "2026-11-15")).toBe("cancelled:2026-11-01");
  });
  it("custom rule applies only when every condition matches", () => {
    const c = one([bk({ status: "completed", pickup_date: "2026-11-05" })]);
    const r = (f: any) => ruleTriggerKey(c, { trigger_type: "custom", delay_days: 10, audience_filter: { event: "completed_trip", ...f } }, "2026-11-15");
    expect(r({})).toBe("custom:completed_trip:2026-11-05");
    expect(r({ min_trips: 2 })).toBeNull();
    expect(r({ booked: "no" })).toBeNull();
  });
});
