import { describe, expect, it } from "vitest";
import { buildCustomers, campaignAudience } from "@/lib/my-customers";
import { ruleTriggerKey, quietOk, campaignWarnings, EMAIL_TEMPLATES } from "@/lib/email-automation";

const base = { bookings: [], payments: [], messages: [], customTours: [], cancellations: [], amendments: [], contacts: [], drivers: [] } as any;

describe("offer email audience", () => {
  const rows = buildCustomers({
    ...base,
    bookings: [
      { id: "1", email: "booker@x.com", created_at: "2026-01-01", status: "completed", pickup_date: "2026-11-10" },
      { id: "2", email: "cancelled@x.com", created_at: "2026-01-01", status: "cancelled" },
      { id: "3", email: "unsub@x.com", created_at: "2026-01-01", status: "completed" },
    ],
    messages: [{ email: "enquiry@x.com", created_at: "2026-11-13T10:00:00Z" }, { email: "ticked@x.com", created_at: "2026-01-01" }],
    contacts: [{ email: "ticked@x.com", opted_in: true }, { email: "unsub@x.com", opted_in: false, unsubscribed_at: "2026-02-01" }],
  });
  it("includes opted-in people and past bookers, never unsubscribed, fully cancelled or enquiry-only without consent", () => {
    expect(campaignAudience(rows, "all").map((r) => r.email).sort()).toEqual(["booker@x.com", "ticked@x.com"]);
    expect(rows.find((r) => r.email === "booker@x.com")?.basis).toBe("soft_opt_in");
  });
  it("blocked addresses are never emailed", () => {
    const r = buildCustomers({ ...base, bookings: [{ id: "1", email: "b@x.com", created_at: "1", status: "completed" }], contacts: [{ email: "b@x.com", suppressed_reason: "bounced" }] });
    expect(campaignAudience(r, "all")).toEqual([]);
  });
  it("after-trip rule fires once the delay has passed, keyed to that trip", () => {
    const c = rows.find((r) => r.email === "booker@x.com")!;
    expect(ruleTriggerKey(c, { trigger_type: "after_trip", delay_days: 3 }, "2026-11-12")).toBeNull();
    expect(ruleTriggerKey(c, { trigger_type: "after_trip", delay_days: 3 }, "2026-11-13")).toBe("trip:2026-11-10");
    expect(ruleTriggerKey(c, { trigger_type: "after_trip", delay_days: 3 }, "2027-01-01")).toBeNull();
  });
  it("enquiry rule skips people with no permission", () => {
    const c = rows.find((r) => r.email === "enquiry@x.com")!;
    expect(ruleTriggerKey(c, { trigger_type: "enquiry_no_booking", delay_days: 1 }, "2026-11-15")).toBeNull();
  });
});

describe("safety", () => {
  it("quiet days stop a second email within 7 days", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    expect(quietOk("2026-11-10T12:00:00Z", 7, now)).toBe(false);
    expect(quietOk("2026-11-08T12:00:00Z", 7, now)).toBe(true);
  });
  it("warns about a missing or expired coupon, unknown placeholders and an empty audience", () => {
    const w = campaignWarnings({ subject: "Hi {{nmae}}", body: "Use code {{coupon_code}}", audienceSize: 0 }, "2026-11-15");
    expect(w.length).toBe(3);
    expect(campaignWarnings({ subject: "Hi", body: "Code {{coupon_code}}", coupon: { active: true, expires_at: "2026-11-01" } }, "2026-11-15")).toContain("The attached coupon has expired.");
  });
  it("template copy has no em dashes", () => {
    for (const t of EMAIL_TEMPLATES) expect(`${t.subject}${t.body}`).not.toMatch(/—/);
  });
});
